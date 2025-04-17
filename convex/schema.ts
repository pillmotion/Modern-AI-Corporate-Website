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
});