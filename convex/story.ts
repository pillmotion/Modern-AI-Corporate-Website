import { Doc, Id } from "./_generated/dataModel";
import { authQuery } from "./util";
import { ConvexError, v } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";

export const getStory = authQuery({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args): Promise<Doc<"story"> | null> => {
        const story = await ctx.db.get(args.storyId);
        return story;
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