"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Import Button
import { Spinner } from "@/components/spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { useMemo, useCallback, useTransition } from "react";
import { StoryCard } from "../story-card";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle } from "lucide-react"; // Import icons

export function StoryContent() {
    const { storyId } = useParams<{ storyId: Id<"story"> }>();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isAddingSegment, startAddTransition] = useTransition();

    const storyResult = useQuery(api.story.getStory, storyId ? { storyId } : "skip");
    const titleResult = useQuery(api.story.getStoryTitle, storyId ? { storyId } : "skip"); // Fetch title separately or combine in getStory
    const segmentsResult = useQuery(api.segments.getSegments, storyId ? { storyId } : "skip");

    const sortedSegments = useMemo(() => {
        if (!segmentsResult) return [];
        return [...segmentsResult].sort((a, b) => a.order - b.order);
    }, [segmentsResult]);

    const addSegmentMutation = useMutation(api.segments.addSegmentAfter);


    const handleAddSegmentAfter = useCallback((order: number) => {
        if (!storyId) return;
        startAddTransition(async () => {
            try {
                await addSegmentMutation({ storyId, afterOrder: order });
                toast({ title: t('segmentAdded') });
            } catch (error) {
                toast({ title: t('error'), description: error instanceof Error ? error.message : t('addSegmentFailed'), variant: "destructive" });
            }
        });
    }, [storyId, addSegmentMutation, toast, t, startAddTransition]);

    const handleAddSegmentAtEnd = useCallback(() => {
        if (!storyId) return;
        const lastOrder = sortedSegments.length > 0 ? sortedSegments[sortedSegments.length - 1].order : -1;
        handleAddSegmentAfter(lastOrder);
    }, [storyId, sortedSegments, handleAddSegmentAfter]);

    const isStoryLoading = storyResult === undefined || titleResult === undefined;
    const areSegmentsLoading = segmentsResult === undefined;

    if (isStoryLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spinner className="w-8 h-8" />
                <span className="ml-2 text-primary">{t('loadingStory')}...</span>
            </div>
        );
    }

    if (storyResult === null || titleResult === null) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p>{t('storyNotFoundOrUnauthorized')}</p>
                {/* Optionally provide a link back or more info */}
            </div>
        );
    }

    if (segmentsResult === null) { // Assuming null indicates an error state from query/auth
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p>{t('errorLoadingSegments')}</p>
                {/* Could add a retry button */}
            </div>
        );
    }

    const story = storyResult; // Assign after checks
    const title = titleResult;
    const isVertical = story.isVertical ?? true;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <main className="container mx-auto px-4 py-6 md:py-10 space-y-6 md:space-y-8">
                {/* Story Title Card */}
                <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg overflow-hidden">
                    <CardHeader>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-center break-words">
                            {title}
                        </h1>
                    </CardHeader>
                </Card>

                {/* Segments Area */}
                <div className="space-y-6">
                    {/* Segment Loading State */}
                    {areSegmentsLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Spinner className="w-6 h-6" />
                            <span className="ml-2 text-muted-foreground">{t('loadingSegments')}...</span>
                        </div>
                    ) : sortedSegments.length === 0 ? (
                        // No Segments Yet state
                        <div className="text-center text-muted-foreground py-12">
                            <p className="mb-4">{t('noSegmentsYet')}</p>
                            <Button onClick={handleAddSegmentAtEnd} disabled={isAddingSegment}>
                                {isAddingSegment ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                {t('addFirstSegment')}
                            </Button>
                        </div>
                    ) : (
                        // Grid for Segment Cards
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 justify-items-center">
                            {sortedSegments.map((segment) => (
                                <StoryCard
                                    key={segment._id}
                                    segment={segment}
                                    storyId={storyId}
                                    isVertical={isVertical}
                                    className="w-full h-full"
                                // Pass the handler if needed by StoryCard (depends on decision in StoryCard)
                                />
                            ))}
                        </div>
                    )}

                    {/* Add Segment Button (at the end) */}
                    {!areSegmentsLoading && sortedSegments.length > 0 && (
                        <div className="flex justify-center pt-4">
                            <Button onClick={handleAddSegmentAtEnd} variant="outline" disabled={isAddingSegment}>
                                {isAddingSegment ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                {t('addSegment')}
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}