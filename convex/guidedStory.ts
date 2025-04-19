import { v, ConvexError } from "convex/values";
import { authMutation } from "./util";
import { action, internalAction, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { consumeCreditsHelper } from "./credits";
import OpenAI from "openai";
import { CREDIT_COSTS } from "./constants";
import { verifyStoryOwnerHelper } from "./story";

export const generateGuidedStoryMutation = authMutation({
    args: {
        title: v.string(),
        description: v.string(),
    },
    async handler(ctx, args) {
        await consumeCreditsHelper(ctx, ctx.user._id, CREDIT_COSTS.CHAT_COMPLETION);

        const storyId = await ctx.db.insert("story", {
            title: args.title,
            userId: ctx.user._id,
            script: "",
            status: "processing",
        });

        await ctx.scheduler.runAfter(
            0,
            internal.guidedStory.generateGuidedStoryAction,
            {
                storyId,
                description: args.description,
                userId: ctx.user._id,
            },
        );
        return storyId;
    },
});

export const generateGuidedStoryAction = internalAction({
    args: {
        storyId: v.id("story"),
        description: v.string(),
        userId: v.id("users"),
    },
    async handler(ctx, args) {
        const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY
        });
        if (!process.env.DEEPSEEK_API_KEY) {
            throw new Error("DeepSeek API key not set in environment variables.");
        }
        try {
            const response = await openai.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional writer tasked with creating a short story for a voice over based on a given description. The story should be a story that is 10,000 characters max length. DO NOT TITLE ANY SEGMENT. JUST RETURN THE TEXT OF THE ENTIRE STORY. THIS IS FOR A VOICE OVER, ONLY INCLUDE THE SPOKEN WORDS.",
                    },
                    {
                        role: "user",
                        content: args.description,
                    },
                ],
                temperature: 0.8,
            });


            const story = response.choices[0].message.content;
            if (!story) throw new Error("Failed to generate story");

            await ctx.runMutation(internal.guidedStory.updateStoryScript, {
                storyId: args.storyId,
                script: story,
                status: "completed",
            });
        } catch (error) {
            console.error("Error in generateGuidedStoryAction:", error);

            await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                storyId: args.storyId,
                errorMessage: error instanceof Error ? error.message : "Unknown error during generation",
            });
            throw error;
        }
    }
});

export const refineStoryMutation = authMutation({
    args: {
        storyId: v.id("story"),
        refinement: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {
        const { storyId, refinement } = args;

        const story = await verifyStoryOwnerHelper(ctx, storyId);
        const currentScript = story.script;

        if (!currentScript?.trim()) {
            console.warn(`Cannot refine empty script for story: ${storyId}`);
            return;
        }

        if (story.status === "processing") {
            console.warn(`Story ${storyId} is already processing.`);
            throw new ConvexError("Story is currently being processed. Please wait.");
        }

        await consumeCreditsHelper(ctx, ctx.user._id, CREDIT_COSTS.CHAT_COMPLETION);

        try {
            await ctx.db.patch(storyId, { status: "processing" });
        } catch (patchError) {
            console.error(`Failed to set status to processing for story ${storyId}:`, patchError);
            throw new ConvexError("Failed to update story status before scheduling refinement.");
        }

        await ctx.scheduler.runAfter(0, internal.guidedStory.refineStoryAction, {
            storyId: storyId,
            currentScript: currentScript,
            refinement: refinement,
        });
    },
});

export const refineStoryAction = internalAction({
    args: {
        storyId: v.id("story"),
        currentScript: v.string(),
        refinement: v.string(),
    },
    handler: async (ctx, args): Promise<void> => {
        const { storyId, currentScript, refinement } = args;

        const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY
        });
        if (!process.env.DEEPSEEK_API_KEY) {
            throw new Error("DeepSeek API key not set in environment variables.");
        }

        let refinedScript: string | null = null;
        try {
            const response = await openai.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional writer tasked with creating a short story for a voice over based on a given description. The story should be a story that is 10,000 characters max length. DO NOT TITLE ANY SEGMENT. JUST RETURN THE TEXT OF THE ENTIRE STORY. THIS IS FOR A VOICE OVER, ONLY INCLUDE THE SPOKEN WORDS.",
                    },
                    {
                        role: "user",
                        content: `Refinement instruction: ${refinement}\n\nOriginal script:\n---\n${currentScript}\n---`,
                    },
                ],
                temperature: 0.8,
            });

            refinedScript = response.choices[0].message.content?.trim() ?? null;

            if (!refinedScript) {
                console.warn(`AI refinement returned empty content for story ${storyId}.`);
                await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                    storyId,
                    errorMessage: "AI failed to produce refinement content.",
                });
                return;
            }

        } catch (error) {
            console.error(`AI refinement API call failed for story ${storyId}:`, error);
            const errorMessage = `AI service error: ${error instanceof Error ? error.message : String(error)}`;
            await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                storyId,
                errorMessage,
            });
            throw error;
        }

        try {
            await ctx.runMutation(internal.guidedStory.updateStoryScript, {
                storyId: storyId,
                script: refinedScript,
                status: "completed",
            });
        } catch (saveError) {
            console.error(`Failed to save refined script for story ${storyId}:`, saveError);
            const errorMessage = `Database error saving refinement: ${saveError instanceof Error ? saveError.message : String(saveError)}`;
            await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                storyId,
                errorMessage,
            });
            throw saveError;
        }
    }
});

export const updateStoryStatusToError = internalMutation({
    args: { storyId: v.id("story"), errorMessage: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.storyId, {
            status: "error",
        });
    },
});

export const updateStoryScript = internalMutation({
    args: {
        storyId: v.id("story"),
        script: v.string(),
        status: v.union(
            v.literal("draft"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("error")
        ),
    },
    handler: async (ctx, args) => {
        const { storyId, script, status } = args;
        await ctx.db.patch(storyId, {
            script,
            status,
        });
    },
});

export const updateStoryScriptPublic = mutation({
    args: {
        storyId: v.id("story"),
        script: v.string(),
    },
    handler: async (ctx, args) => {
        const { storyId, script } = args;
        const accessObj = await verifyStoryOwnerHelper(ctx, storyId);
        if (!accessObj) throw new Error("You don't have access to this story");
        await ctx.db.patch(storyId, {
            script,
        });
    },
});

/* export const generateSegmentsMutation = authMutation({
    args: {
        storyId: v.id("story"),
        isVertical: v.boolean(),
    },
    async handler(ctx, args) {
        const { storyId, isVertical } = args;

        const accessObj = await verifyStoryOwnerHelper(ctx, storyId);
        if (!accessObj) throw new Error("You don't have access to this story");

        const story = accessObj.story;

        await ctx.db.patch(storyId, { isVertical });

        await consumeCreditsHelper(ctx, accessObj.userId, CREDIT_COSTS.CHAT_COMPLETION);

        await ctx.scheduler.runAfter(
            0,
            internal.guidedStory.generateSegmentsAction,
            {
                storyId,
                script: story.script,
                userId: accessObj.userId,
            },
        );
    },
}); */

/* export const generateSegmentsAction = internalAction({
    args: {
        storyId: v.id("story"),
        script: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const context = await generateContext(args.script);
        if (!context) throw new Error("Failed to generate context");

        const segments = args.script.split(/\n{2,}/);

        await ctx.runMutation(internal.story.updateStoryContext, {
            storyId: args.storyId,
            context,
        });

        for (let i = 0; i < segments.length; i++) {
            await ctx.runMutation(internal.segments.createSegmentWithImageInternal, {
                storyId: args.storyId,
                text: segments[i],
                order: i,
                context,
                userId: args.userId,
            });
        }
    }
}); */