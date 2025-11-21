import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
    // Get svix headers
    const headerPayload = await headers();

    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // Check if svix headers are present
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Error: Missing Svix headers', { status: 400 });
    }

    // Parse the request body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Verify the signature
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return new Response('Error: Missing webhook secret', { status: 500 });
    }

    const webhook = new Webhook(webhookSecret);

    let event: WebhookEvent;

    try {
        event = webhook.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature
        }) as WebhookEvent;
    }
    catch (error) {
        console.log(error);
        return new Response('Error: Invalid signature', { status: 400 });
    }

    // Handle specific event types
    const eventType = event.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const {id, email_addresses, first_name, last_name, image_url} = event.data;

        try {
            await connectDB();

            await User.findOneAndUpdate({clerkId: id}, {
                clerkId: id,
                email: email_addresses[0]?.email_address || '',
                firstName: first_name || '',
                lastName: last_name || '',
                imageUrl: image_url || '',
            }, {upsert: true, new: true});
        } catch (error) {
            console.log(error);
            return new Response('Error syncing user to database', { status: 500 });
        }
    }

    return new Response('Webhook received successfully', { status: 200 });
}