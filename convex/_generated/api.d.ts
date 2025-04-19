/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as clerk from "../clerk.js";
import type * as constants from "../constants.js";
import type * as credits from "../credits.js";
import type * as guidedStory from "../guidedStory.js";
import type * as http from "../http.js";
import type * as replicate from "../replicate.js";
import type * as segments from "../segments.js";
import type * as story from "../story.js";
import type * as stripe from "../stripe.js";
import type * as users from "../users.js";
import type * as util from "../util.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  clerk: typeof clerk;
  constants: typeof constants;
  credits: typeof credits;
  guidedStory: typeof guidedStory;
  http: typeof http;
  replicate: typeof replicate;
  segments: typeof segments;
  story: typeof story;
  stripe: typeof stripe;
  users: typeof users;
  util: typeof util;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
