"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { useTranslation } from "@/hooks/useTranslation";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { useMemo, useCallback, useTransition, useState } from "react";
import { StoryCard } from "../story-card";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Pencil } from "lucide-react";
import { EditImageContextDialog } from "./edit-image-context";

export function StoryContent() {
    const { storyId } = useParams<{ storyId: Id<"story"> }>();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isAddingSegment, startAddTransition] = useTransition();
    const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);

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

    const handleOpenContextDialog = () => {
        setIsContextDialogOpen(true);
    };

    const isStoryLoading = storyResult === undefined || titleResult === undefined;
    const areSegmentsLoading = segmentsResult === undefined;

    if (isStoryLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spinner className="w-8 h-8" />
                <span className="ml-2 text-primary">{t('loadingStory')}</span>
            </div>
        );
    }

    if (storyResult === null || titleResult === null) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p>{t('storyNotFoundOrUnauthorized')}</p>
            </div>
        );
    }

    if (segmentsResult === null) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p>{t('errorLoadingSegments')}</p>
            </div>
        );
    }

    const story = storyResult;
    const title = titleResult;
    const isVertical = story.isVertical ?? true;

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
                <main className="container mx-auto px-4 py-6 md:py-10 space-y-6 md:space-y-8">

                    <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-x-4 pt-6 pb-6">
                            <h1 className="flex-grow text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words mr-4"> {/* Added margin-right */}
                                {title}
                            </h1>
                            <div className="flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="md:hidden"
                                    onClick={handleOpenContextDialog}
                                    disabled={isStoryLoading}
                                    aria-label={t('editImageContext')}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden md:inline-flex"
                                    onClick={handleOpenContextDialog}
                                    disabled={isStoryLoading}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t('editImageContext')}
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Segments Area */}
                    <div className="space-y-6">
                        {areSegmentsLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <Spinner className="w-6 h-6" />
                                <span className="ml-2 text-muted-foreground">{t('loadingSegments')}</span>
                            </div>
                        ) : sortedSegments.length === 0 ? (
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

            <EditImageContextDialog
                isOpen={isContextDialogOpen}
                onOpenChange={setIsContextDialogOpen}
                storyId={storyId}
                initialContext={storyResult?.context}
            />
        </>
    );
}