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
): Promise<Doc<"story">> {

    // 1. 获取故事文档
    const story = await ctx.db.get(storyId);
    if (!story) {
        throw new ConvexError(`Story not found with ID: ${storyId}`);
    }
    const user = (ctx as any).user;

    if (!user) {
        throw new ConvexError("User record not found for the logged-in user.");
    }
    if (story.userId !== user._id) {
        throw new ConvexError(`Access denied: User ${user._id} does not own story ${storyId} (Owner: ${story.userId})`);
    }
    return story;
}