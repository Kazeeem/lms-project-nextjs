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