import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const FREE_CREDITS = 5;

const calculateCredits = (planType: string): number => {
    switch (planType) {
        case "thousandCredits": return 1000;
        case "tenThousandCredits": return 10000;
        case "thirtyThousandCredits": return 30000;
        default:
            console.warn(`Unknown plan type encountered: ${planType}`);
            return 0; // Return 0 for unknown plans to avoid errors
    }
};

export const createUser = internalMutation({
    args: {
        email: v.string(),
        userId: v.string(),
        name: v.string(),
        profileImage: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (user) return;

        await ctx.db.insert("users", {
            email: args.email,
            userId: args.userId,
            profileImage: args.profileImage,
            credits: FREE_CREDITS,
            name: args.name,
        });
    },
});

export const updateUser = internalMutation({
    args: { userId: v.string(), name: v.string(), profileImage: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (!user) {
            throw new ConvexError("user not found");
        }

        await ctx.db.patch(user._id, {
            name: args.name,
            profileImage: args.profileImage,
        });
    },
});

// 获取当前登录用户的 Convex 数据 (包括积分)
export const getCurrentUserCredits = query({
    args: {}, // 不需要参数
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity(); // 获取 Clerk 身份信息

        if (!identity) {
            // 用户未登录
            console.log("No user identity found.");
            return null;
        }

        // 使用 Clerk subject (用户唯一 ID) 查询 Convex users 表
        // 使用正确的索引名 "by_userId" 和字段名 "userId"
        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject)) // Corrected index and field
            .unique();

        if (!user) {
            // 在 Convex users 表中未找到对应用户
            console.warn(`Convex user not found for Clerk ID: ${identity.subject}`);
            return null;
        }

        // 返回需要的数据
        return {
            _id: user._id, // Convex User ID
            credits: user.credits,
            // name: user.name // Optionally return other fields
        };
    },
});

export const addCredits = internalMutation({
    args: {
        clerkUserId: v.string(), // <-- CORRECTED: Should be v.string()
        planType: v.string(),
    },
    handler: async (ctx, args) => {
        // Now args.clerkUserId is correctly typed as a string for the query
        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", args.clerkUserId))
            .unique();

        if (!user) {
            console.error(`[addCredits] User not found with Clerk ID: ${args.clerkUserId}. Cannot add credits.`);
            return;
        }

        const amountToAdd = calculateCredits(args.planType);

        if (amountToAdd <= 0) {
            console.error(`[addCredits] Invalid plan type or zero credits calculated for plan '${args.planType}' for user with Clerk ID ${args.clerkUserId}.`);
            return;
        }

        const currentCredits = user.credits ?? 0;

        await ctx.db.patch(user._id, {
            credits: currentCredits + amountToAdd,
        });

        console.log(`[addCredits] Successfully added ${amountToAdd} credits to user with Clerk ID ${args.clerkUserId} (Convex ID: ${user._id}). New balance: ${currentCredits + amountToAdd}`);
    },
});
