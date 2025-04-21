"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, ImageIcon, AlertCircle, Trash, Wand2, Pencil, Sparkles, Plus } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { CREDIT_COSTS } from "@/convex/constants";
import { EditPromptDialog } from "./edit-prompt-dialog";
import { DeleteSegmentDialog } from "./delete-segment-dialog";

interface StoryCardProps {
    segment: Doc<"segments">;
    storyId: Id<"story">;
    isVertical: boolean;
    characterLimit?: number;
    className?: string;
    // --- Add the callback and loading state props ---
    onAddSegmentAfter: (order: number) => void;
    isAddingSegment: boolean;
}

export function StoryCard({
    segment,
    storyId,
    isVertical,
    characterLimit = 750,
    className,
    onAddSegmentAfter, // Destructure prop
    isAddingSegment,  // Destructure prop
}: StoryCardProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isActionPending, startActionTransition] = useTransition();
    const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const updateSegmentText = useMutation(api.segments.updateSegmentText);
    const latestSegmentRef = useRef(segment);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- State for Text Editing ---
    const [isSavingText, setIsSavingText] = useState(false);
    const [currentText, setCurrentText] = useState(segment.text ?? "");
    const [justRefined, setJustRefined] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const imageStorageId = useMemo(() => {
        const id = segment.image ?? segment.previewImage ?? null;
        console.log(`Segment ${segment._id}: useMemo calculated ID: ${id}`);
        return id;
    }, [segment.image, segment.previewImage]);
    const imageUrl = useQuery(
        api.segments.getImageUrl,
        imageStorageId ? { storageId: imageStorageId, segmentId: segment._id } : "skip"
    );
    const generateImage = useMutation(api.segments.generateImage);
    const deleteSegmentMutation = useMutation(api.segments.deleteSegment);
    const regenerateImageMutation = useMutation(api.segments.regenerateImage);
    const refineTextMutation = useMutation(api.segments.refineText);
    const fullSegment = useQuery(api.segments.get, isPromptDialogOpen ? { segmentId: segment._id } : "skip");

    const charCount = currentText.length;
    const isBusy = segment.isGenerating || isActionPending || isSavingText;
    const isTextareaReadOnly = segment.isGenerating || isActionPending;

    useEffect(() => {
        latestSegmentRef.current = segment;
    }, [segment]);

    // Effect for debounced saving
    useEffect(() => {
        // Skip if text matches initial prop or segment is busy
        if (currentText === segment.text || segment.isGenerating) {
            return;
        }

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(async () => {
            const segmentId = latestSegmentRef.current._id;
            const originalText = latestSegmentRef.current.text ?? "";
            const textToSave = currentText; // Use state value at the time timeout was set

            // Double check against the *latest* prop value before saving
            if (textToSave === latestSegmentRef.current.text) {
                return; // Prop updated during timeout, no actual change needed
            }

            setIsSavingText(true);
            try {
                await updateSegmentText({ segmentId, text: textToSave });
            } catch (error) {
                toast({ title: t('error'), description: error instanceof Error ? error.message : t('saveTextFailed'), variant: "destructive" });
                setCurrentText(originalText); // Revert on error
            } finally {
                setIsSavingText(false);
            }
        }, 800); // Debounce delay

        // Cleanup
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
                debounceTimeoutRef.current = null;
            }
        };
    }, [currentText, segment.text, segment.isGenerating, updateSegmentText, latestSegmentRef, setIsSavingText, setCurrentText, toast, t]);


    useEffect(() => {
        // Only sync if not currently trying to save
        if (!isSavingText) {
            setCurrentText(segment.text ?? "");
        }
        // Also handle refinement feedback (slightly adjusted)
        if (segment.text !== currentText && !segment.isGenerating && !isSavingText) {
            setJustRefined(true);
            const timer = setTimeout(() => setJustRefined(false), 1000);
            // Cleanup timer if effect re-runs or component unmounts
            return () => clearTimeout(timer);
        }
    }, [segment.text, isSavingText]);

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
            if (newText.length <= characterLimit) {
                setCurrentText(newText); // Just update state, effect handles debounce
            } else {
                toast({ title: t('limitReached'), description: t('characterLimitExceeded', { limit: characterLimit }), variant: "destructive" });
            }
        },
        [characterLimit, toast, t, setCurrentText]
    );

    const handleGenerateImage = useCallback(async () => {
        startActionTransition(async () => {
            try {
                await generateImage({ segmentId: segment._id });
                toast({ title: t('imageGenerationStarted') });
            } catch (error) {
                toast({ title: t('error'), description: error instanceof Error ? error.message : t('generateImageFailed'), variant: "destructive" });
            }
        });
    }, [generateImage, segment._id, toast, t, startActionTransition]);

    const handleDeleteSegment = useCallback(async () => {
        if (!window.confirm(t('deleteConfirmation'))) return;
        startActionTransition(async () => {
            try {
                await deleteSegmentMutation({ segmentId: segment._id });
                toast({ title: t('segmentDeleted') });
            } catch (error) {
                toast({ title: t('error'), description: error instanceof Error ? error.message : t('deleteFailed'), variant: "destructive" });
            }
        });
    }, [deleteSegmentMutation, segment._id, toast, t, startActionTransition]);

    const handleRegenerateImage = useCallback(async () => {
        startActionTransition(async () => {
            try {
                await regenerateImageMutation({ segmentId: segment._id });
                toast({ title: t('imageGenerationStarted') });
            } catch (error) {
                toast({ title: t('error'), description: error instanceof Error ? error.message : t('regenerationFailed'), variant: "destructive" });
            }
        });
    }, [regenerateImageMutation, segment._id, toast, t, startActionTransition]);

    const handleRefineText = useCallback(async () => {
        startActionTransition(async () => {
            try {
                if (!currentText.trim()) {
                    toast({ title: t('cannotRefineEmpty'), variant: "destructive" });
                    return;
                }
                await refineTextMutation({ segmentId: segment._id });
                toast({ title: t('textRefinementStarted') });
            } catch (error) {
                toast({ title: t('error'), description: error instanceof Error ? error.message : t('refineTextFailed'), variant: "destructive" });
            }
        });
    }, [refineTextMutation, segment._id, toast, t, startActionTransition]);

    return (
        <>
            <Card className={cn("flex flex-col w-full max-w-sm border-primary/10 shadow-md rounded-lg overflow-hidden bg-background/80 transition-shadow hover:shadow-lg", className)}>
                {/* Header */}
                <CardHeader className="flex flex-row justify-between items-center p-3 bg-muted/30 border-b border-primary/10">
                    <span className="text-sm font-medium text-muted-foreground">
                        {t('segment')} {segment.order + 1}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                                {isActionPending ? <Spinner size="sm" /> : <MoreVertical className="h-4 w-4" />}
                                <span className="sr-only">{t('options')}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleRefineText} disabled={isBusy || !currentText.trim()}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>{t('refineText')} ({CREDIT_COSTS.CHAT_COMPLETION} {t('credits')})</span>
                            </DropdownMenuItem>
                            {segment.image && (
                                <>
                                    <DropdownMenuItem onClick={handleRegenerateImage} disabled={isBusy}>
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        <span>{t('regenerateImage')} ({CREDIT_COSTS.IMAGE_GENERATION} {t('credits')})</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsPromptDialogOpen(true)} disabled={isBusy}>
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        <span>{t('changePrompt')}</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                            {!segment.image && !segment.isGenerating && (
                                <DropdownMenuItem onClick={handleGenerateImage} disabled={isBusy || !currentText.trim()}>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    <span>{t('generateImage')}</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setIsDeleteDialogOpen(true)} // Open the dialog
                                disabled={isBusy}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>{t('deleteSegment')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>

                {/* Image Area */}
                <CardContent className="p-0">
                    <div className={cn(
                        "relative bg-muted/50 w-full overflow-hidden group",
                        isVertical ? "aspect-[9/16]" : "aspect-[16/9]"
                    )}>
                        {segment.isGenerating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                <div className="flex flex-col items-center gap-2 text-white">
                                    <Spinner className="h-8 w-8 animate-spin" />
                                    <span className="text-xs font-medium">{t('generatingImage')}...</span>
                                </div>
                            </div>
                        )}
                        {segment.error && !segment.isGenerating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/30 p-2 z-10 backdrop-blur-sm text-center">
                                <AlertCircle className="h-6 w-6 text-destructive-foreground mb-1" />
                                {/* Simplified error message */}
                                <p className="text-xs text-destructive-foreground font-medium">{t('imageErrorOccurred')}</p>
                                {/* Optionally show retry button based on error type? */}
                            </div>
                        )}
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                alt={t('imageAlt', { order: segment.order + 1 })}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                priority={segment.order < 2} // Prioritize first few images
                            />
                        ) : segment.isGenerating ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                                <Spinner size="md" />
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
                                <ImageIcon className="w-10 h-10 text-muted-foreground/50 mb-2" />
                                <p className="text-xs text-muted-foreground">{t('noImage')}</p>
                                <Button size="sm" variant="secondary" onClick={handleGenerateImage} disabled={isBusy || !currentText.trim()} className="mt-2">
                                    {t('generateImage')}
                                </Button>
                            </div>
                        )}
                        {segment.error && (
                            <div className="absolute bottom-0 left-0 right-0 bg-destructive/80 p-2 text-xs text-destructive-foreground flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>{segment.error}</span>
                            </div>
                        )}
                    </div>
                </CardContent>

                {/* Text Area */}
                <CardContent className="p-3 flex-grow flex flex-col bg-muted/10">
                    <Textarea
                        ref={textareaRef}
                        value={currentText}
                        onChange={handleTextChange}
                        readOnly={isTextareaReadOnly}
                        className={cn(
                            "text-sm text-foreground flex-grow resize-none border-none focus-visible:ring-0", // Original classes
                            "shadow-none bg-transparent min-h-[100px] p-1", // Original classes
                            isTextareaReadOnly && "text-muted-foreground cursor-not-allowed", // Original classes
                            // Add class for visual feedback on refine (Keep this enhancement if desired)
                            justRefined && "transition-colors duration-1000 bg-primary/10"
                        )}
                        maxLength={characterLimit}
                        placeholder={t('writeSegmentText')} // Use the placeholder from the old code
                    />
                    <div className="text-right text-xs text-muted-foreground/70 mt-1 flex justify-end items-center h-4">
                        {isSavingText && <Spinner size="xs" className="h-3 w-3 mr-1 animate-spin" />} {/* Adjusted Spinner size */}
                        <span className={cn(charCount > characterLimit ? "text-destructive font-semibold" : "")}>
                            {charCount} / {characterLimit}
                        </span>
                    </div>
                </CardContent>

                <CardFooter className="p-2 border-t border-primary/10 bg-muted/20">
                    <Button
                        variant="ghost" // Subtle appearance
                        size="sm"
                        className="w-full text-muted-foreground hover:text-primary hover:bg-primary/10 justify-center" // Center content
                        onClick={() => onAddSegmentAfter(segment.order)}
                        disabled={isBusy} // Use the combined busy state from the top
                    >
                        {/* Show spinner only if THIS specific add is pending (isAddingSegment comes from parent) */}
                        {isAddingSegment ? <Spinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        {t('addSegmentAfter')}
                    </Button>
                </CardFooter>
            </Card>

            {/* Prompt Editing Dialog (Conditional Rendering) */}
            {isPromptDialogOpen && fullSegment && (
                <EditPromptDialog
                    // --- FIX: Pass segmentId ---
                    segmentId={fullSegment._id}
                    // --- FIX: Pass initialPrompt ---
                    initialPrompt={fullSegment.prompt}
                    isOpen={isPromptDialogOpen}
                    onOpenChange={setIsPromptDialogOpen}
                />
            )}
            {isPromptDialogOpen && !fullSegment && (
                // Simplified loading indicator or reuse the Dialog structure with Spinner
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <Spinner />
                </div>
            )}

            <DeleteSegmentDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                segmentId={segment._id}
                segmentOrder={segment.order} // Pass order for display
            />
        </>
    );
}