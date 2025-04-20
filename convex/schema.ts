import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        userId: v.string(),
        email: v.string(),
        subscriptionId: v.optional(v.string()),
        endsOn: v.optional(v.number()),
        credits: v.number(),
        name: v.optional(v.string()),
        isAdmin: v.optional(v.boolean()),
        profileImage: v.optional(v.string()),
        isPremium: v.optional(v.boolean()),
    })
        .index("by_userId", ["userId"])
        .index("by_subscriptionId", ["subscriptionId"]),
    story: defineTable({
        title: v.string(),
        userId: v.id("users"),
        script: v.string(),
        status: v.union(
            v.literal("draft"),
            v.literal("processing"),         // For text generation/refinement
            v.literal("generating_segments"),
            v.literal("completed"),
            v.literal("error")
        ),
        isVertical: v.optional(v.boolean()),
        context: v.optional(v.string()),
        pendingSegments: v.optional(v.number()), // <-- The counter field
        errorMessage: v.optional(v.string()),   // Optional but recommended for error details
    })
        .index("by_userId", ["userId"])
        .index("by_userId_status", ["userId", "status"]), // Example index
    segments: defineTable({
        storyId: v.id("story"),
        text: v.string(),
        order: v.number(),
        isGenerating: v.boolean(),
        image: v.optional(v.id("_storage")),
        previewImage: v.optional(v.id("_storage")),
        prompt: v.optional(v.string()),
        error: v.optional(v.string()),
    })
        .index("by_storyId", ["storyId"]) // Index needed for the final check
        .index("by_story_order", ["storyId", "order"]),
});