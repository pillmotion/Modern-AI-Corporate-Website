import Replicate from "replicate";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Jimp } from 'jimp';
import { Id } from "./_generated/dataModel";

const replicate = new Replicate();

const SCALED_IMAGE_WIDTH = 468;
const SCALED_IMAGE_HEIGHT = 850;

export const regenerateSegmentImageUsingPrompt = internalAction({
    args: { segmentId: v.id("segments") },
    async handler(ctx, args) {
        let storyId: Id<"story"> | undefined;

        try {
            const segment = await ctx.runQuery(internal.segments.getSegmentInternal, { segmentId: args.segmentId });
            if (!segment) throw new Error("Segment not found");
            storyId = segment.storyId;

            const promptToUse = segment.prompt; // *** Fetch prompt from segment ***
            if (!promptToUse) throw new Error(`Prompt missing for segment ${args.segmentId}`);

            const story = await ctx.runQuery(internal.story.getStoryInternal, { storyId });
            if (!story) throw new Error("Story not found");

            // *** Clear previous error before trying Replicate (optional but good) ***
            await ctx.runMutation(internal.segments.updateSegment, {
                segmentId: args.segmentId,
                error: "",
                isGenerating: true,
            });

            const isVertical = story.isVertical ?? false;
            const width = isVertical ? 1080 : 1920;
            const height = isVertical ? 1920 : 1080;

            let output: any;
            if (process.env.IMAGE_MODEL === "flux") {
                output = await replicate.run("black-forest-labs/flux-schnell", {
                    input: {
                        prompt: promptToUse,
                        num_outputs: 1,
                        disable_safety_checker: false,
                        aspect_ratio: isVertical ? "9:16" : "16:9",
                        output_format: "jpg",
                        output_quality: 90,
                    },
                });
            } else {
                output = await replicate.run(
                    "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
                    {
                        input: {
                            width,
                            height,
                            disable_safety_checker: true,
                            prompt: promptToUse,
                            negative_prompt:
                                "nsfw, out of frame, lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, deformed, cross-eyed,",
                            num_inference_steps: 50,
                            prompt_strength: 0.8,
                            high_noise_frac: 0.8,
                            guidance_scale: 7.5,
                        },
                    },
                );
            }

            const url = output[0];
            if (!url) throw new Error("Replicate did not return URL");

            const response = await fetch(url);
            const blob = await response.blob();

            const arrayBuffer = await blob.arrayBuffer();
            const buf = Buffer.from(arrayBuffer);

            const originalImage = await Jimp.fromBuffer(buf).then((image) => {
                return image.getBuffer("image/jpeg", { quality: 90 });
            });
            const storageId: Id<"_storage"> = await ctx.storage.store(
                new Blob([originalImage], { type: "image/jpeg" }),
            );

            const previewImage = (await Jimp.fromBuffer(buf)).scaleToFit({
                w: isVertical ? SCALED_IMAGE_WIDTH : SCALED_IMAGE_HEIGHT,
                h: isVertical ? SCALED_IMAGE_HEIGHT : SCALED_IMAGE_WIDTH,
            });
            const previewImageBuffer = await previewImage.getBuffer("image/jpeg", {
                quality: 90,
            });
            const previewStorageId: Id<"_storage"> = await ctx.storage.store(
                new Blob([previewImageBuffer], { type: "image/jpeg" }),
            );

            await ctx.runMutation(internal.segments.updateSegment, {
                segmentId: args.segmentId,
                image: storageId,
                previewImage: previewStorageId,
                isGenerating: false,
                error: "",
            });
        } catch (err) {
            const error = err as Error;
            console.error(`Image generation/processing failed for segment ${args.segmentId}:`, error.message);
            if (args.segmentId) {
                await ctx.runMutation(internal.segments.updateSegment, {
                    segmentId: args.segmentId,
                    isGenerating: false,
                    error: `Image generation failed: ${error.message}`,
                });
            }
        } finally {
            if (storyId) {
                try {
                    console.log(`Calling decrement for story ${storyId} (segment ${args.segmentId})`);
                    await ctx.runMutation(internal.story.decrementPendingSegmentsAndFinalize, { storyId });
                } catch (decrementError) {
                    console.error(`CRITICAL: Failed to decrement counter for story ${storyId}:`, decrementError);
                }
            } else {
                console.warn(`Cannot decrement: storyId missing for segment ${args.segmentId}.`);
            }
        }
    },
});
