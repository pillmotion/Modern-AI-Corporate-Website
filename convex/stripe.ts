"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type Metadata = {
    userId: string;
    credits: string;
};

export const pay = action({
    args: { credits: v.number() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new Error("you must be logged in to purchase credits");
        }

        if (!user.emailVerified) {
            throw new Error("you must have a verified email to purchase credits");
        }

        const priceIds: Record<number, string> = {
            1000: process.env.STRIPE_PRICE_ID_THOUSAND!,
            10000: process.env.STRIPE_PRICE_ID_TEN_THOUSAND!,
            30000: process.env.STRIPE_PRICE_ID_THIRTY_THOUSAND!,
        };
        const priceId = priceIds[args.credits];

        if (!priceId) {
            throw new Error("Invalid price id");
        }

        const domain = process.env.HOSTING_URL ?? "http://localhost:3000";
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-03-31.basil",
        });
        const session = await stripe.checkout.sessions.create({
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: user.email,
            metadata: {
                userId: user.subject,
                credits: args.credits,
            },
            mode: "payment",
            success_url: `${domain}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/#pricing`,
        });

        return session.url!;
    },
});

export const fulfill = internalAction({
    args: { signature: v.string(), payload: v.string() },
    handler: async (ctx, args) => {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-03-31.basil",
        });

        const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET!;
        try {
            const event = stripe.webhooks.constructEvent(
                args.payload,
                args.signature,
                webhookSecret
            );

            const completedEvent = event.data.object as Stripe.Checkout.Session & {
                metadata: Metadata;
            };

            if (event.type === "checkout.session.completed") {
                const userId = completedEvent.metadata.userId;
                const credits = completedEvent.metadata.credits;

                await ctx.runMutation(internal.users.addCredits, {
                    userId,
                    credits: parseInt(credits),
                });
            }

            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false, error: (err as { message: string }).message };
        }
    },
});
