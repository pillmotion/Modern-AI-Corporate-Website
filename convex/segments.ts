import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { consumeCreditsHelper } from "./credits";
import { internal } from "./_generated/api";
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from "openai";

const CREDIT_COSTS = {
    IMAGE_GENERATION: 10,
};

/* export const createSegmentInternal = internalMutation({
    args: {
        storyId: v.id("story"),
        text: v.string(),
        order: v.number(),
        isGenerating: v.boolean(),
    },
    async handler(ctx, args) {
        return await ctx.db.insert("segments", {
            storyId: args.storyId,
            text: args.text,
            order: args.order,
            isGenerating: args.isGenerating ?? false,
        })
    },
}); */

/* export const createSegmentWithImageInternal = internalMutation({
    args: {
        userId: v.id("users"),
        storyId: v.id("story"),
        text: v.string(),
        order: v.number(),
        context: v.string(),
    },
    async handler(ctx, args) {
        const segmentId = await ctx.db.insert("segments", {
            storyId: args.storyId,
            text: args.text,
            order: args.order,
            isGenerating: true,
        });

        await consumeCreditsHelper(ctx, args.userId, CREDIT_COSTS.IMAGE_GENERATION);

        await ctx.scheduler.runAfter(
            0,
            internal.segments.generateSegmentImageReplicateInternal,
            {
                segment: {
                    text: args.text,
                    _id: segmentId,
                },
                context: args.context,
            },
        );
    },
}); */

/* export const generateSegmentImageReplicateInternal = internalAction({
    args: {
        context: v.optional(v.string()),
        segment: v.object({
            text: v.string(),
            _id: v.id("segments"),
        }),
    },
    async handler(ctx, args) {
        const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY
        });
        if (!process.env.DEEPSEEK_API_KEY) {
            throw new Error("DeepSeek API key not set in environment variables.");
        }
        const prompt = await openai.chat.completions
            .create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: getSystemPrompt(args.context),

                    },
                    { role: "user", content: args.segment.text },
                ],
                response_format: zodResponseFormat(
                    z.object({
                        prompt: z.string(),
                    }),
                    "prompt",
                )
            })
            .then((completion) => {
                const content = completion.choices[0].message.content as string;
                return JSON.parse(content).prompt as string;
            });

        await ctx.scheduler.runAfter(
            0,
            internal.replicate.regenerateSegmentImageUsingPrompt,
            {
                segmentId: args.segment._id,
                prompt,
            },
        );
    },
}); */
