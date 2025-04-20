import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { consumeCreditsHelper } from "./credits";
import { internal } from "./_generated/api";
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from "openai";
import { CREDIT_COSTS } from "./constants";
import { Id } from "./_generated/dataModel";

export const createSegmentInternal = internalMutation({
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
});

export const createSegmentWithImageInternal = internalMutation({
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
            error: undefined,
        });

        try {
            await consumeCreditsHelper(ctx, args.userId, CREDIT_COSTS.IMAGE_GENERATION);
        } catch (creditError) {
            console.error("Credit consumption failed:", creditError);
            await ctx.db.patch(segmentId, { isGenerating: false, error: "Credit error" });
            await ctx.runMutation(internal.story.decrementPendingSegmentsAndFinalize, { storyId: args.storyId });
            throw creditError;
        }

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
});

export const generateSegmentImageReplicateInternal = internalAction({
    args: {
        context: v.optional(v.string()),
        segment: v.object({
            text: v.string(),
            _id: v.id("segments"),
        }),
    },
    async handler(ctx, args) {
        const segmentId = args.segment._id;
        let storyId: Id<"story"> | undefined;
        try {
            const segmentDoc = await ctx.runQuery(internal.segments.getSegmentInternal, { segmentId });
            if (!segmentDoc) throw new Error("Segment not found during prompt generation");
            storyId = segmentDoc.storyId;

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

            await ctx.runMutation(internal.segments.updateSegment, {
                segmentId: segmentId,
                prompt: prompt,
            });

            await ctx.scheduler.runAfter(
                0,
                internal.replicate.regenerateSegmentImageUsingPrompt,
                { segmentId: segmentId }
            );
        } catch (error) {
            console.error(`Prompt generation failed for segment ${segmentId}:`, error);
            if (segmentId && storyId) {
                await ctx.runMutation(internal.segments.updateSegment, {
                    segmentId: segmentId,
                    isGenerating: false,
                    error: `Prompt generation failed: ${error instanceof Error ? error.message : String(error)}`,
                });
                await ctx.runMutation(internal.story.decrementPendingSegmentsAndFinalize, { storyId });
            } else {
                console.error("Cannot update segment error or decrement counter: IDs missing.");
            }
        }
    },
});

export const getSegmentInternal = internalQuery({
    args: { segmentId: v.id("segments") },
    async handler(ctx, args) {
        return await ctx.db.get(args.segmentId);
    },
});

export const updateSegment = internalMutation({
    args: {
        segmentId: v.id("segments"),
        isGenerating: v.optional(v.boolean()),
        image: v.optional(v.id("_storage")),
        previewImage: v.optional(v.id("_storage")),
        prompt: v.optional(v.string()),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { segmentId, ...rest } = args;

        const existingSegment = await ctx.db.get(segmentId);
        if (!existingSegment) {
            console.error(`Segment not found with ID: ${segmentId}. Cannot update.`);
            throw new Error(`Segment not found: ${segmentId}`);
        }

        await ctx.db.patch(segmentId, rest);
    },
});

function getSystemPrompt(context?: string): string {
    let prompt = `You are an expert image prompt generator. Your task is to create a concise, visually descriptive image prompt based on the provided story segment and context. The prompt should be suitable for an AI image generation model (like SDXL or Flux).

Story Context (if provided): ${context ? context : 'No overall context provided.'}

Instructions:
1. Read the user's text segment carefully.
2. Generate a single, effective image prompt that captures the essence of the segment visually.
3. The prompt should be in English.
4. Respond ONLY with a JSON object containing a single key "prompt" whose value is the generated image prompt string. Example: {"prompt": "A lone astronaut stands on a red Martian plain, looking at a distant blue sunset."}`;

    return prompt;
}

/* export const createSegmentAndScheduleImageGen = internalMutation({
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
            error: undefined,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.segments.generatePromptAndImageAction,
            {
                segmentId: segmentId,
                context: args.context,
            },
        );
    },
}); */
