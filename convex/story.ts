import { Doc, Id } from "./_generated/dataModel";
import { authQuery } from "./util";
import { ConvexError, v } from "convex/values";
import { QueryCtx, MutationCtx, internalQuery, internalMutation } from "./_generated/server";

export const getStory = authQuery({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args): Promise<Doc<"story"> | null> => {
        const story = await ctx.db.get(args.storyId);
        return story;
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

export const updateStoryContext = internalMutation({
    args: {
        storyId: v.id("story"),
        context: v.string(),
    },
    handler: async (ctx, args) => {
        const { storyId, context } = args;

        const existingStory = await ctx.db.get(storyId);
        if (!existingStory) {
            console.error(`Story not found with ID: ${storyId}. Cannot update context.`);
            throw new Error(`Story not found: ${storyId}`);
        }
        await ctx.db.patch(storyId, { context: context });
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
            errorMessage: undefined, // Clear previous errors
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
            // Query segments for errors (OK in mutation)
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
