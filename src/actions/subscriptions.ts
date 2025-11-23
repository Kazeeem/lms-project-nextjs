"use server";

import { currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { checkSubscriptionAction } from "./course";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    //apiVersion: "2025-11-17.clover"
});

export async function createCheckoutSessionAction() {
    try {
        const user = await currentUser();

        if (!user) {
            return {
                success: false,
                error: "You must be signed in to purchase a subscription'"
            }
        }

        // TODO:: Check if user already has a subscription
        const {isSubscribed} = await checkSubscriptionAction(user.id);

        if (isSubscribed) {
            return {
                success: false,
                error: 'You already have a subscription'
            }
        }

        const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'USD',
                        product_data: {
                            name: 'Course Subscription - All Access',
                            description: 'Unlock all courses and content instantly for lifetime access',
                        },
                        unit_amount: 99 * 100
                    },
                    quantity: 1
                }
            ],
            success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}`,
            customer_email: user.emailAddresses[0].emailAddress,
            metadata: {
                clerkId: user.id,
                userEmail: user.emailAddresses[0].emailAddress,
                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            }
        });

        return {
            success: true,
            sessionId: session.id,
            sessionUrl: session.url
        }

    } catch (error) {
        console.log("Error creating checkout session", error);
        return {
            success: false,
            error: "An error occured while processing your request. Please try again."
        }
    }
}

export async function ensureSubscriptionFromSessionAction(sessionId:string) {
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return {
                success: false,
                status: 'unpaid',
                error: 'Payment not completed',
            }
        }

        const clerkId = session.metadata?.clerkId as string;

        if (!clerkId) {
            return {
                success: false,
                status: 'error',
                error:  'Missing clerkI in session metadata'
            }
        }

        const connectDB = (await import('@/lib/mongodb')).default;
        const Subscription = (await import('@/models/Subscription')).default;
        await connectDB();

        const paymentIntentId = session.payment_intent as string;

        let subscription = await Subscription.findOne({
            stripePaymentIntentId: paymentIntentId
        });

        if (subscription) {
            return {
                success: true,
                status: subscription.status,
                subscription: JSON.parse(JSON.stringify(subscription)),
                message: subscription.status === 'completed' ? 'Subscription already activated' : 'Subscription pending admin review'
            }
        }

        subscription = await Subscription.findOne({clerkId});

        if (subscription) {
            subscription.stripePaymentIntentId = paymentIntentId;
            subscription.status = 'pending';
            subscription.amount = (session.amount_total || 9900) / 100;
            subscription.purchaseDate = new Date();
            subscription.stripeCustomerId = session.customer as string;
            await subscription.save();
            return {
                success: true,
                status: subscription.status,
                subscription: JSON.parse(JSON.stringify(subscription)),
                message: 'Subscription created and pending admin review'
            }
        }

        subscription = await Subscription.create({
            userId: clerkId,
            clerkId,
            status: 'pending',
            amount: (session.amount_total || 9900) / 100,
            currency: 'USD',
            stripePaymentIntentId: paymentIntentId,
            purchaseDate: new Date(),
            stripeCustomerId: session.customer as string,
        })

        return {
            success: true,
            status: subscription.status,
            subscription: JSON.parse(JSON.stringify(subscription)),
            message: 'Subscription created and pending admin review'
        }
    } catch (error) {
        console.log('Error ensuring subscription from session:', error);
        return {
            success: false,
            status: 'error',
            error: 'An error occured while processing your request. Please try again.'
        }
    }
}