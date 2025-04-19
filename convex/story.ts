import { Doc } from "./_generated/dataModel";
import { authQuery } from "./util";
import { v } from "convex/values";

export const getStory = authQuery({
    args: {
        storyId: v.id("story"),
    },
    handler: async (ctx, args): Promise<Doc<"story"> | null> => {
        const story = await ctx.db.get(args.storyId);
        return story;
    },
});