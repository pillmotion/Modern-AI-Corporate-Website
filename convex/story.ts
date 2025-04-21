import { Doc, Id } from "./_generated/dataModel";
import { authMutation, authQuery } from "./util";
import { ConvexError, v } from "convex/values";
import { QueryCtx, MutationCtx, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { consumeCreditsHelper } from "./credits";
import { CREDIT_COSTS } from "./constants";
import { generateContext } from "./guidedStory";
import { internal } from "./_generated/api";

export const getStory = authQuery({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args): Promise<Doc<"story"> | null> => {
        const story = await ctx.db.get(args.storyId);
        return story;
    },
});

export const getStoryTitle = authQuery({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args): Promise<string | null> => {
        // 尝试获取故事文档
        const story = await ctx.db.get(args.storyId);

        return story ? story.title : null;
    },
});

export const getStoryInternal = internalQuery({
    args: { storyId: v.id("story") },
    async handler(ctx, args) {
        return await ctx.db.get(args.storyId);
    },
});

export async function verifyStoryOwnerHelper(
    ctx: MutationCtx | QueryCtx,
    storyId: Id<"story">
): Promise<{ story: Doc<"story">, userId: Id<"users"> }> {

    // 1. 获取故事文档
    const story = await ctx.db.get(storyId);
    if (!story) {
        throw new ConvexError(`Story not found with ID: ${storyId}`);
    }
    const user = (ctx as any).user;

    if (!user?._id) {
        throw new ConvexError("User authentication context is missing, invalid, or user ID is unavailable.");
    }
    const userId = user._id as Id<"users">;

    if (story.userId !== userId) {
        throw new ConvexError(`Access denied: User ${userId} does not own story ${storyId} (Owner: ${story.userId})`);
    }

    return { story: story, userId: userId };
}

export const updateStoryContextInternal = internalMutation({
    args: {
        storyId: v.id("story"),
        context: v.string(),
    },
    handler: async (ctx, args) => {
        const { storyId, context } = args;
        try {
            await ctx.db.patch(storyId, { context: context });
            console.log(`Internal context updated for story ${storyId}`);
        } catch (error) {
            console.error(`Failed to update internal context for story ${storyId}:`, error);
            throw new ConvexError("Failed to update story context internally.");
        }
    },
});

export const updateUserStoryContext = authMutation({
    args: {
        storyId: v.id("story"),
        context: v.string(),
    },
    handler: async (ctx, args) => {
        const { storyId, context } = args;
        await verifyStoryOwnerHelper(ctx, storyId);
        try {
            await ctx.db.patch(storyId, { context: context });
            console.log(`User updated context for story ${storyId}`);
        } catch (dbError) {
            console.error(`Failed to save user context for story ${storyId}:`, dbError);
            throw new ConvexError("Database error saving context.");
        }
    },
});

export const regenerateStoryContext = authMutation({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args) => {
        const { storyId } = args;
        const { story, userId } = await verifyStoryOwnerHelper(ctx, storyId);

        if (!story.script || !story.script.trim()) {
            throw new ConvexError("Cannot regenerate context for an empty story script.");
        }

        await consumeCreditsHelper(ctx, userId, CREDIT_COSTS.CHAT_COMPLETION);

        await ctx.scheduler.runAfter(0, internal.story.regenerateStoryContextAction, {
            storyId: storyId,
            script: story.script,
        });

        console.log(`Scheduled context regeneration for story ${storyId}`);
    },
});

export const regenerateStoryContextAction = internalAction({
    args: {
        storyId: v.id("story"),
        script: v.string(),
    },
    handler: async (ctx, args) => {
        const { storyId, script } = args;

        let newContext: string | null = null;
        try {
            newContext = await generateContext(script);

            if (!newContext) {
                console.warn(`Action: AI failed to regenerate context for story ${storyId}.`);
                return;
            }
        } catch (error) {
            console.error(`Action: Error calling generateContext for story ${storyId}:`, error);
            throw new ConvexError(`Failed to regenerate context: ${error instanceof Error ? error.message : "AI service error"}`);
        }

        try {
            await ctx.runMutation(internal.story.updateStoryContextInternal, {
                storyId: storyId,
                context: newContext,
            });
        } catch (dbError) {
            console.error(`Action: Failed to save regenerated context for story ${storyId}:`, dbError);
            throw new ConvexError("Database error saving regenerated context.");
        }
    },
});

export const initializeSegmentGeneration = internalMutation({
    args: {
        storyId: v.id("story"),
        segmentCount: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.storyId, {
            pendingSegments: args.segmentCount,
            status: "generating_segments",
            errorMessage: undefined,
        });
    },
});

export const decrementPendingSegmentsAndFinalize = internalMutation({
    args: { storyId: v.id("story") },
    handler: async (ctx, args) => {
        const story = await ctx.db.get(args.storyId);
        if (!story || story.status !== "generating_segments" || !story.pendingSegments || story.pendingSegments <= 0) {
            console.warn(`Decrement called on story ${args.storyId} in unexpected state. Status: ${story?.status}, Pending: ${story?.pendingSegments}. Ignoring.`);
            return;
        }

        const newCount = story.pendingSegments - 1;
        await ctx.db.patch(args.storyId, { pendingSegments: newCount });

        if (newCount === 0) {
            console.log(`All segments processed for story ${args.storyId}. Checking errors...`);
            const segmentsWithError = await ctx.db
                .query("segments")
                .withIndex("by_storyId", (q) => q.eq("storyId", args.storyId))
                .filter((q) => q.neq(q.field("error"), undefined) && q.neq(q.field("error"), null) && q.neq(q.field("error"), ""))
                .collect();

            const finalStatus = segmentsWithError.length > 0 ? "error" : "completed";
            const finalErrorMessage = segmentsWithError.length > 0 ? `${segmentsWithError.length} segment(s) failed.` : undefined;

            console.log(`Finalizing story ${args.storyId} with status: ${finalStatus}`);
            await ctx.db.patch(args.storyId, {
                status: finalStatus,
                errorMessage: finalErrorMessage,
            });
        }
    },
});
