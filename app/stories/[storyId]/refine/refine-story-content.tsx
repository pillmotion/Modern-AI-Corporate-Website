"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useRef, useCallback, useEffect } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";

const CREDIT_COSTS = {
    IMAGE_GENERATION: 10,
};

const SERVICE_LIMITS = {
    minimax: 10000
};

// debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): { (...args: Parameters<T>): void; cancel: () => void; } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<T>): void => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func(...args); }, wait);
    };

    // Add a cancel method for cleanup
    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debounced;
}

export function RefineStoryContent() {
    const { t } = useTranslation();
    const params = useParams();
    const storyId = params.storyId as Id<"story">;
    const story = useQuery(api.story.getStory, { storyId });
    const [isVertical, setIsVertical] = useState(story?.isVertical ?? true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();
    const updateStoryScript = useMutation(
        api.guidedStory.updateStoryScriptPublic,
    );
    /* const generateSegments = useMutation(
        api.guidedStory.generateSegmentsMutation,
    ); */
    const lastStatus = useRef(story?.status);

    const [isUnsaved, setIsUnsaved] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const debouncedUpdate = useCallback(
        debounce((newScript: string) => {
            updateStoryScript({ storyId, script: newScript });
            setIsUnsaved(false);
        }, 500),
        [storyId, updateStoryScript],
    );

    useEffect(() => {
        return () => {
            debouncedUpdate.cancel();
        };
    }, [debouncedUpdate]);

    useEffect(() => {
        if (lastStatus.current === "processing" && story?.status === "completed") {
            if (textareaRef.current) {
                textareaRef.current.value = story.script;
            }
        }
        lastStatus.current = story?.status;
    }, [story]);

    if (!story) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner className="w-8 h-8" />
                <span className="ml-2 text-primary">{t('loading')}</span>
            </div>
        );
    }

    /* const handleGenerateSegments = async () => {
        setIsGenerating(true);
        try {
            await generateSegments({ storyId, isVertical });
            setIsGenerating(false);
            router.push(`/stories/${storyId}`);
        } catch (error) {
            console.error("Failed to generate segments:", error);
        } finally {
            setIsGenerating(false);
        }
    }; */

    const wordCount = story.script.split(/\s+/).length;
    /* const estimatedVideoLength = estimateVideoLength(wordCount); */

    const estimatedSegments = story.script.split(/\n{2,}/).length;
    const estimatedCredits = estimatedSegments * CREDIT_COSTS.IMAGE_GENERATION;

    return (
        <div className="min-h-screen">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8">
                <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg">
                    <CardHeader className="border-b border-primary/10 pb-4 md:pb-6">
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text text-transparent text-center">
                            {t('refineYourStory')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 md:pt-6">
                        <div className="space-y-4 md:space-y-8">
                            <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-md">
                                <CardHeader className="space-y-1 md:space-y-2">
                                    <CardTitle className="text-lg md:text-xl bg-primary bg-clip-text text-transparent">
                                        {story.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4">
                                    <div className="relative">
                                        <Textarea
                                            ref={textareaRef}
                                            className="min-h-[120px] md:min-h-[400px] bg-background/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300 resize-none text-sm md:text-base"
                                            maxLength={SERVICE_LIMITS.minimax}
                                            value={story.script}
                                            onChange={(e) => debouncedUpdate(e.target.value)}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                            {story.script.length}/{SERVICE_LIMITS.minimax.toLocaleString()} {t('characters')}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}