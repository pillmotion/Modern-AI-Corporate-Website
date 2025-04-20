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

        const accessObj = await verifyStoryOwnerHelper(ctx, storyId);

        const story = accessObj.story;
        const userId = accessObj.userId;

        const currentScript = story.script;

        if (!currentScript?.trim()) {
            console.warn(`Cannot refine empty script for story: ${storyId}`);
            throw new ConvexError("Cannot refine an empty script.");
        }

        if (story.status === "processing") {
            console.warn(`Story ${storyId} is already processing.`);
            throw new ConvexError("Story is currently being processed. Please wait.");
        }

        await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.CHAT_COMPLETION);

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
            errorMessage: args.errorMessage,
            pendingSegments: 0, // Ensure counter is cleared
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

export const updateStoryScriptPublic = authMutation({
    args: {
        storyId: v.id("story"),
        script: v.string(),
    },
    handler: async (ctx, args) => {
        const { storyId, script } = args;
        await verifyStoryOwnerHelper(ctx, storyId);
        await ctx.db.patch(storyId, {
            script,
        });
    },
});

export const generateSegmentsMutation = authMutation({
    args: {
        storyId: v.id("story"),
        isVertical: v.boolean(),
    },
    async handler(ctx, args) {
        const { storyId, isVertical } = args;

        const accessObj = await verifyStoryOwnerHelper(ctx, storyId);

        const story = accessObj.story;
        const userId = accessObj.userId;

        await ctx.db.patch(storyId, { isVertical });

        await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.CHAT_COMPLETION);

        await ctx.scheduler.runAfter(
            0,
            internal.guidedStory.generateSegmentsAction,
            {
                storyId,
                script: story.script,
                userId: userId,
            },
        );
    },
});

export const generateSegmentsAction = internalAction({
    args: {
        storyId: v.id("story"),
        script: v.string(),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        let context: string | null = null;
        try {
            // await consumeCreditsHelper(ctx, args.userId, CREDIT_COSTS.CHAT_COMPLETION_LOW);
            context = await generateContext(args.script);

            if (!context) {
                await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                    storyId: args.storyId,
                    errorMessage: "Failed to generate story context.",
                });
                return;
            }
            await ctx.runMutation(internal.story.updateStoryContext, {
                storyId: args.storyId,
                context,
            });
        } catch (contextError) {
            console.error(`Error during context generation/saving for story ${args.storyId}:`, contextError);
            await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                storyId: args.storyId,
                errorMessage: contextError instanceof Error ? `Context error: ${contextError.message}` : "Unknown context error",
            });
            return;
        }

        const segments = args.script?.split(/\n{2,}/).filter(Boolean) ?? [];
        if (segments.length === 0) {
            await ctx.runMutation(internal.guidedStory.updateStoryScript, {
                storyId: args.storyId, script: args.script, status: "completed"
            });
            return;
        }

        try {
            await ctx.runMutation(internal.story.initializeSegmentGeneration, {
                storyId: args.storyId,
                segmentCount: segments.length,
            });
        } catch (initError) {
            console.error(`Failed to init segment generation for story ${args.storyId}:`, initError);
            await ctx.runMutation(internal.guidedStory.updateStoryStatusToError, {
                storyId: args.storyId,
                errorMessage: "Initialization failed.",
            });
            return;
        }

        for (let i = 0; i < segments.length; i++) {
            try {
                await ctx.runMutation(internal.segments.createSegmentWithImageInternal, {
                    storyId: args.storyId,
                    text: segments[i],
                    order: i,
                    context: context,
                    userId: args.userId,
                });
            } catch (scheduleError) {
                console.error(`Failed to schedule segment ${i} for story ${args.storyId}:`, scheduleError);

                try {
                    await ctx.runMutation(internal.story.decrementPendingSegmentsAndFinalize, {
                        storyId: args.storyId,
                    });
                } catch (decrementError) {
                    console.error(`Failed to decrement after scheduling error:`, decrementError);
                }
            }
        }
    }
});

async function generateContext(script: string): Promise<string | null> {
    if (!script || !script.trim()) {
        console.warn("generateContext called with empty script.");
        return null;
    }

    const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY
    });
    if (!process.env.DEEPSEEK_API_KEY) {
        console.error("DeepSeek API key not set for generateContext.");
        throw new Error("DeepSeek API key not set in environment variables.");
    }

    const systemPrompt = `You are an AI assistant specialized in summarizing texts. Read the following story script and provide a concise summary (1-2 sentences) capturing the main theme, characters, and setting. This summary will be used as context for generating consistent images for different parts of the story. Focus on visual elements and overall mood. Output ONLY the summary text.`;

    try {
        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: script },
            ],
            temperature: 0.5,
            max_tokens: 100,
        });

        const context = response.choices[0]?.message?.content?.trim() ?? null;

        if (!context) {
            console.warn("AI failed to generate context for the script.");
            return null;
        }
        return context;

    } catch (error) {
        console.error("Error calling OpenAI for context generation:", error);
        return null;
    }
}
