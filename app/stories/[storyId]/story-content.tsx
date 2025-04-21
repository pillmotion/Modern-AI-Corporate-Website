"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, AlertTriangle, Pencil, Wand2, Sparkles, BookOpen, Copy, Video } from "lucide-react";
import { EditImageContextDialog } from "./edit-image-context";

export function StoryContent() {
    const { storyId } = useParams<{ storyId: Id<"story"> }>();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isAddingSegment, startAddTransition] = useTransition();
    const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);

    const [isReviewing, startReviewTransition] = useTransition();
    const [isFixingGrammar, startFixGrammarTransition] = useTransition();
    const [isReading, startReadTransition] = useTransition();
    const [isCloning, startCloneTransition] = useTransition();
    const [isGeneratingVideo, startGenerateVideoTransition] = useTransition();

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
    const isAnyGlobalActionPending = isReviewing || isFixingGrammar || isReading || isCloning || isGeneratingVideo;

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
                                        className="w-full" // h-full might not be needed if footer standardizes height
                                        onAddSegmentAfter={handleAddSegmentAfter} // Pass handler
                                        isAddingSegment={isAddingSegment}      // Pass loading state
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {!isStoryLoading && !areSegmentsLoading && storyResult && segmentsResult && (
                        <Card className="mt-8 backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg">
                            <CardContent className="p-4 sm:p-6"> {/* Reduced padding slightly */}
                                {/* Use grid for better control on mobile, flex on larger screens */}
                                <div className="grid grid-cols-2 sm:flex sm:flex-row sm:justify-center sm:items-center gap-3 sm:gap-4 flex-wrap">
                                    {/* Review Story Button */}
                                    <Button
                                        variant="outline"
                                        // onClick={handleReviewStory}
                                        disabled={isAnyGlobalActionPending || isAddingSegment}
                                        className="border-primary/30 hover:border-primary/50 hover:bg-primary/5 w-full sm:w-auto justify-start sm:justify-center text-left sm:text-center"
                                    >
                                        {isReviewing ? <Spinner size="sm" className="mr-2" /> : <Wand2 className="mr-2 h-4 w-4 flex-shrink-0" />}
                                        <span className="truncate">{t('reviewStory')}</span>
                                    </Button>

                                    {/* Fix Grammar Button */}
                                    <Button
                                        variant="outline"
                                        // onClick={handleFixGrammar}
                                        disabled={isAnyGlobalActionPending || isAddingSegment}
                                        className="border-primary/30 hover:border-primary/50 hover:bg-primary/5 w-full sm:w-auto justify-start sm:justify-center text-left sm:text-center"
                                    >
                                        {isFixingGrammar ? <Spinner size="sm" className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4 flex-shrink-0" />}
                                        <span className="truncate">{t('fixGrammar')}</span>
                                    </Button>

                                    {/* Read Full Story Button */}
                                    <Button
                                        variant="outline"
                                        // onClick={handleReadFullStory}
                                        disabled={isAnyGlobalActionPending || isAddingSegment}
                                        className="border-primary/30 hover:border-primary/50 hover:bg-primary/5 w-full sm:w-auto justify-start sm:justify-center text-left sm:text-center"
                                    >
                                        {isReading ? <Spinner size="sm" className="mr-2" /> : <BookOpen className="mr-2 h-4 w-4 flex-shrink-0" />}
                                        <span className="truncate">{t('readFullStory')}</span>
                                    </Button>

                                    {/* Clone Story Button */}
                                    <Button
                                        variant="outline"
                                        // onClick={handleCloneStory}
                                        disabled={isAnyGlobalActionPending || isAddingSegment}
                                        className="border-primary/30 hover:border-primary/50 hover:bg-primary/5 w-full sm:w-auto justify-start sm:justify-center text-left sm:text-center"
                                    >
                                        {isCloning ? <Spinner size="sm" className="mr-2" /> : <Copy className="mr-2 h-4 w-4 flex-shrink-0" />}
                                        <span className="truncate">{isVertical ? t('cloneToHorizontal') : t('cloneToVertical')}</span>
                                    </Button>

                                    {/* Generate Video Button - Spans 2 cols on mobile grid */}
                                    <Button
                                        // onClick={handleGenerateVideo}
                                        disabled={isAnyGlobalActionPending || isAddingSegment || sortedSegments.length === 0}
                                        className="bg-primary hover:bg-primary/90 w-full sm:w-auto justify-center col-span-2 sm:col-span-1" // Span 2 cols on mobile
                                    >
                                        {isGeneratingVideo ? <Spinner size="sm" className="mr-2" /> : <Video className="mr-2 h-4 w-4 flex-shrink-0" />}
                                        {t('generateVideo')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
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