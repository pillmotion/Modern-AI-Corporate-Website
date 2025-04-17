// convex/stripe.ts
"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper to map planType to Stripe Price ID (Store these in Convex env vars)
const getPriceId = (planType: string): string => {
    switch (planType) {
        case "thousandCredits": // <-- 修改这里
            // 确保环境变量名称 STRIPE_PRICE_ID_THOUSAND 在 Convex 设置了
            return process.env.STRIPE_PRICE_ID_THOUSAND!;
        case "tenThousandCredits": // <-- 修改这里
            return process.env.STRIPE_PRICE_ID_TEN_THOUSAND!;
        case "thirtyThousandCredits": // <-- 修改这里
            return process.env.STRIPE_PRICE_ID_THIRTY_THOUSAND!;
        default:
            throw new Error(`Unknown plan type: ${planType}`);
    }
};

// Renamed action, accepts planType
export const createCheckoutSession = action({
    args: { planType: v.string() }, // <-- Argument from frontend
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new Error("you must be logged in to purchase");
        }
        // Optional: keep email verification check if needed
        // if (!user.emailVerified) {
        //     throw new Error("you must have a verified email to purchase");
        // }

        const domain = process.env.HOSTING_URL ?? "http://localhost:3000";
        // Ensure STRIPE_SECRET_KEY matches your env var name in Convex
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-03-31.basil", // Use a recent, stable API version
        });

        const priceId = getPriceId(args.planType); // <-- Get dynamic price ID

        const session = await stripe.checkout.sessions.create({
            line_items: [{ price: priceId, quantity: 1 }], // <-- Use dynamic price ID
            // customer_email: user.email, // Optional: prefill email
            metadata: {
                userId: user.subject,
                planType: args.planType, // Store plan type in metadata too
            },
            mode: "payment", // <-- Changed to 'payment' for "Pay As You Go"
            success_url: `${domain}/payment-success?session_id={CHECKOUT_SESSION_ID}`, // Customize as needed
            cancel_url: `${domain}/#pricing`, // Customize as needed
        });

        if (!session.url) {
            throw new Error("Could not create Stripe session URL");
        }

        return session.url; // <-- Return the URL
    },
});

// --- fulfill action remains largely the same, but adjust logic ---
// --- based on whether you're updating subscriptions or adding one-time credits ---
export const fulfill = internalAction({
    args: { signature: v.string(), payload: v.string() },
    handler: async (ctx, args) => {
        // Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOKS_SECRET match env var names
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-03-31.basil", // Match API version
        });
        const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET!;

        try {
            const event = stripe.webhooks.constructEvent(
                args.payload,
                args.signature,
                webhookSecret
            );

            // Handle 'checkout.session.completed' for payment success
            if (event.type === "checkout.session.completed") {
                const session = event.data.object as Stripe.Checkout.Session & {
                    metadata: { userId: string, planType: string }; // Assuming metadata structure
                };

                // Ensure payment status is 'paid' if necessary (usually is for completed event)
                if (session.payment_status === "paid") {
                    const clerkUserId = session.metadata.userId;
                    const planType = session.metadata.planType;

                    try {
                        // Call the mutation with the correct argument name
                        await ctx.runMutation(internal.users.addCredits, {
                            clerkUserId: clerkUserId, // <-- Pass Clerk ID with the correct arg name
                            planType
                        });
                        console.log(`[fulfill] addCredits mutation called for user ${clerkUserId}, plan ${planType}`);
                    } catch (mutationError) {
                        console.error(`[fulfill] Error calling addCredits mutation for user ${clerkUserId}:`, mutationError);
                        // return { success: false, error: "Failed to update user credits." }; 
                    }
                } else {
                    console.warn(`Checkout session completed but payment status is ${session.payment_status}`);
                }
            }

            // Remove or adapt subscription-specific logic if using one-time payments
            // if (event.type === "invoice.payment_succeeded") { ... }

            return { success: true };
        } catch (err) {
            console.error("Stripe Webhook Error:", err);
            return { success: false, error: (err as { message: string }).message };
        }
    },
});
