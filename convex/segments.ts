import { internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { consumeCreditsHelper } from "./credits";
import { internal } from "./_generated/api";
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from "openai";
import { CREDIT_COSTS } from "./constants";
import { Id } from "./_generated/dataModel";
import { verifyStoryOwnerHelper } from "./story";
import { authMutation, authQuery } from "./util";

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
                apiKey: process.env.OPENAI_API_KEY
            });
            if (!process.env.OPENAI_API_KEY) {
                throw new Error("OpenAI API key not set in environment variables.");
            }
            const prompt = await openai.chat.completions
                .create({
                    model: "gpt-4o-mini",
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

export const get = authQuery({
    args: { segmentId: v.id("segments") },
    async handler(ctx, args) {
        const segment = await ctx.db.get(args.segmentId);
        if (!segment) {
            throw new Error("Segment not found");
        }
        await verifyStoryOwnerHelper(ctx, segment.storyId);
        return segment;
    },
});

export const getSegments = authQuery({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args) => {
        if (!ctx.user) {
            throw new ConvexError("User must be logged in to view segments.");
        }

        const story = await ctx.db.get(args.storyId);
        if (!story) {
            throw new Error("Story not found");
        }

        if (story.userId !== ctx.user._id) {
            throw new Error("Unauthorized to access this story's segments");
        }

        const segments = await ctx.db
            .query("segments")
            .withIndex("by_story_order", (q) => q.eq("storyId", args.storyId))
            .collect();

        return segments;
    },
});

export const updateSegment = internalMutation({
    args: {
        segmentId: v.id("segments"),
        text: v.optional(v.string()),
        isGenerating: v.optional(v.boolean()),
        image: v.optional(v.id("_storage")),
        previewImage: v.optional(v.id("_storage")),
        prompt: v.optional(v.string()),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { segmentId, ...rest } = args;

        if (rest.text === null || rest.text === undefined) {
            delete rest.text;
        }

        if (rest.error === "") {
            rest.error = undefined;
        }

        if (rest.prompt === "") {
            rest.prompt = undefined;
        }

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
});
 */

export const getImageUrl = authQuery({
    args: {
        storageId: v.id("_storage"),
        segmentId: v.id("segments"),
    },
    handler: async (ctx, args): Promise<string | null> => {
        const segment = await ctx.db.get(args.segmentId);

        if (!segment) {
            console.warn(`getImageUrl: Segment ${args.segmentId} not found.`);
            return null;
        }

        if (segment.previewImage !== args.storageId && segment.image !== args.storageId) {
            console.warn(`getImageUrl: Storage ID ${args.storageId} does not match previewImage or image for segment ${args.segmentId}.`);
            return null;
        }

        try {
            await verifyStoryOwnerHelper(ctx, segment.storyId);
            return await ctx.storage.getUrl(args.storageId);
        } catch (error) {
            console.warn(`getImageUrl: Unauthorized access attempt for segment ${args.segmentId}. Error: ${error}`);
            return null;
        }
    },
});

export const addSegmentAfter = authMutation({
    args: {
        storyId: v.id("story"),
        afterOrder: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId } = await verifyStoryOwnerHelper(ctx, args.storyId);

        const newOrder = args.afterOrder + 1;

        const subsequentSegments = await ctx.db
            .query("segments")
            .withIndex("by_story_order", (q) =>
                q.eq("storyId", args.storyId).gte("order", newOrder)
            )
            .order("desc")
            .collect();

        for (const segment of subsequentSegments) {
            await ctx.db.patch(segment._id, { order: segment.order + 1 });
        }

        const newSegmentId = await ctx.db.insert("segments", {
            storyId: args.storyId,
            text: "",
            order: newOrder,
            isGenerating: false,
        });

        console.log(`Added new segment ${newSegmentId} at order ${newOrder} for story ${args.storyId}`);

        // Optional: Consume credits if adding a segment costs credits?
        // await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.ADD_SEGMENT); // Define this cost if needed

        return { success: true, newSegmentId };
    },
});

export const generateImage = authMutation({
    args: {
        segmentId: v.id("segments"),
    },
    handler: async (ctx, args) => {
        const segment = await ctx.db.get(args.segmentId);
        if (!segment) {
            throw new Error("Segment not found");
        }
        if (!segment.text?.trim()) {
            throw new Error("Segment text is empty, cannot generate image.");
        }
        if (segment.image || segment.isGenerating) {
            console.warn(`Image already exists or is generating for segment ${args.segmentId}. Skipping.`);
            return { success: false, message: "Image already exists or is generating." };
        }

        const { userId, story } = await verifyStoryOwnerHelper(ctx, segment.storyId);

        try {
            await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.IMAGE_GENERATION);
        } catch (creditError) {
            console.error("Credit consumption failed for manual image generation:", creditError);
            await ctx.db.patch(segment._id, { error: "Credit error" });
            throw creditError;
        }

        await ctx.db.patch(args.segmentId, {
            isGenerating: true,
            error: undefined,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.segments.generateSegmentImageReplicateInternal,
            {
                segment: {
                    text: segment.text,
                    _id: args.segmentId,
                },
                context: story.context,
            },
        );

        return { success: true };
    },
});

export const deleteSegment = authMutation({
    args: {
        segmentId: v.id("segments"),
    },
    handler: async (ctx, args) => {
        const segmentToDelete = await ctx.db.get(args.segmentId);
        if (!segmentToDelete) {
            console.warn(`Segment ${args.segmentId} not found for deletion.`);
            return { success: true };
        }

        await verifyStoryOwnerHelper(ctx, segmentToDelete.storyId);

        const storyId = segmentToDelete.storyId;
        const deletedOrder = segmentToDelete.order;

        await ctx.db.delete(args.segmentId);
        console.log(`Deleted segment ${args.segmentId}`);

        const subsequentSegments = await ctx.db
            .query("segments")
            .withIndex("by_story_order", (q) => q.eq("storyId", storyId).gt("order", deletedOrder))
            .collect();

        await Promise.all(
            subsequentSegments.map(segment =>
                ctx.db.patch(segment._id, { order: segment.order - 1 })
            )
        );

        console.log(`Reordered ${subsequentSegments.length} segments after deleting segment at order ${deletedOrder}.`);

        const story = await ctx.db.get(storyId);
        if (story?.status === 'generating_segments' && story.pendingSegments && story.pendingSegments > 0) {
            console.log(`Decrementing pending segments for story ${storyId} due to deletion during generation.`);
            await ctx.runMutation(internal.story.decrementPendingSegmentsAndFinalize, { storyId });
        }

        return { success: true };
    },
});

export const regenerateImage = authMutation({
    args: {
        segmentId: v.id("segments"),
    },
    handler: async (ctx, args) => {
        const segment = await ctx.db.get(args.segmentId);
        if (!segment) {
            throw new Error("Segment not found");
        }
        if (!segment.prompt) {
            throw new Error("Segment prompt not found, cannot regenerate image.");
        }
        if (segment.isGenerating) {
            console.warn(`Image is already generating for segment ${args.segmentId}. Skipping regenerate request.`);
            return { success: false, message: "Image is already generating." };
        }

        const { userId } = await verifyStoryOwnerHelper(ctx, segment.storyId);

        try {
            await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.IMAGE_GENERATION);
        } catch (creditError) {
            console.error("Credit consumption failed for image regeneration:", creditError);
            await ctx.db.patch(segment._id, { error: "Credit error" });
            throw creditError;
        }

        await ctx.db.patch(args.segmentId, {
            isGenerating: true,
            error: undefined,
        });

        await ctx.scheduler.runAfter(
            0,
            internal.replicate.regenerateSegmentImageUsingPrompt,
            {
                segmentId: args.segmentId,
            },
        );

        return { success: true };
    },
});

export const updateSegmentText = authMutation({
    args: {
        segmentId: v.id("segments"),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        const segment = await ctx.db.get(args.segmentId);
        if (!segment) {
            throw new Error("Segment not found");
        }

        await verifyStoryOwnerHelper(ctx, segment.storyId);

        await ctx.db.patch(args.segmentId, {
            text: args.text,
        });

        return { success: true };
    },
});

export const savePrompt = authMutation({
    args: {
        segmentId: v.id("segments"),
        prompt: v.string(),
    },
    handler: async (ctx, args) => {
        const segment = await ctx.db.get(args.segmentId);
        if (!segment) {
            throw new Error("Segment not found");
        }

        await verifyStoryOwnerHelper(ctx, segment.storyId);

        await ctx.db.patch(args.segmentId, {
            prompt: args.prompt.trim(),
        });

        console.log(`Updated prompt for segment ${args.segmentId}`);
        return { success: true };
    },
});

export const refineText = authMutation({
    args: {
        segmentId: v.id("segments"),
    },
    handler: async (ctx, args) => {
        const segment = await ctx.db.get(args.segmentId);
        if (!segment) {
            throw new Error("Segment not found");
        }
        if (!segment.text?.trim()) {
            throw new Error("Segment text is empty, cannot refine.");
        }
        // Keep this check - if an image *is* actually generating, don't start refining.
        if (segment.isGenerating) {
            console.warn(`Segment ${args.segmentId} is already generating (image). Skipping refine request.`);
            return { success: false, message: "Segment is busy generating an image." };
        }

        const { userId } = await verifyStoryOwnerHelper(ctx, segment.storyId);

        try {
            await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.CHAT_COMPLETION);
        } catch (creditError) {
            console.error("Credit consumption failed for text refinement:", creditError);
            // Only patch the error here, don't set isGenerating
            await ctx.db.patch(segment._id, { error: "Credit error" });
            throw creditError;
        }

        // --- MODIFICATION START ---
        // Remove isGenerating: true from this patch.
        // We only need to clear any previous error before starting.
        await ctx.db.patch(args.segmentId, {
            // isGenerating: true, // REMOVE THIS LINE
            error: undefined,
        });
        // --- MODIFICATION END ---

        await ctx.scheduler.runAfter(
            0,
            internal.segments.refineTextAction,
            {
                segmentId: args.segmentId,
            }
        );

        return { success: true };
    },
});

export const refineTextAction = internalAction({
    args: {
        segmentId: v.id("segments"),
    },
    handler: async (ctx, args) => {
        try {
            const segment = await ctx.runQuery(internal.segments.getSegmentInternal, { segmentId: args.segmentId });
            if (!segment) throw new Error(`Segment ${args.segmentId} not found for refinement.`);
            if (!segment.text) throw new Error(`Segment ${args.segmentId} has no text to refine.`);

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key not set.");

            const systemPrompt = `You are a professional text editor. Please refine and improve the following text while maintaining its original meaning and tone. Focus on enhancing clarity, readability, grammar, and engagement. Return only the refined text.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: segment.text },
                ],
                temperature: 0.7,
            });

            const refinedText = response.choices[0]?.message?.content?.trim();

            if (!refinedText) {
                throw new Error("AI failed to generate refined text.");
            }

            await ctx.runMutation(internal.segments.updateSegment, {
                segmentId: args.segmentId,
                text: refinedText,
                isGenerating: false,
                error: "",
            });
            console.log(`Refined text for segment ${args.segmentId}`);

        } catch (error) {
            console.error(`Text refinement failed for segment ${args.segmentId}:`, error);
            await ctx.runMutation(internal.segments.updateSegment, {
                segmentId: args.segmentId,
                isGenerating: false,
                error: `Text refinement failed: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    },
});