import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { activateSubscriptionAction } from "@/actions/course";
import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    //apiVersion: '2025-11-17.clover'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    try {
        const body = await req.text();

        const signature = (await headers()).get('stripe-signature')!;

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (error) {
            console.log(error);
            
            return NextResponse.json({
                error: 'Invalid signature'
            }, { status: 400 });
        }

        switch (event.type) {
            case "checkout.session.completed":
                const session = event.data.object as Stripe.Checkout.Session;
                
                const clerkId = session.metadata?.clerkId as string;

                if (!clerkId) {
                    return NextResponse.json({
                        error: "Webhook missing clerk ID"
                    }, { status: 400 });
                }

                const result = await activateSubscriptionAction(clerkId, session.payment_intent as string, session.customer as string | undefined);

                if (!result.success) {
                    return NextResponse.json({
                        error: 'Webhook: Failed activating subscription'
                    }, { status: 500 });
                }

                break;

            case "payment_intent.succeeded":
                const paymentIntent =  event.data.object as Stripe.PaymentIntent;

                /*const clerkId = paymentIntent.metadata?.clerkId as string;

                if (clerkId) {
                    await connectDB();

                    const existingSub = await Subscription.findOne({
                        stripePaymentIntentId: paymentIntent.id
                    });
                }*/

                break;

            case "payment_intent.payment_failed":
                break;
        
            default:
                break;
        }

        return NextResponse.json({received: true}, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({error: 'Webhook: Payment processing webhook failed'}, { status: 500 });
    }
}