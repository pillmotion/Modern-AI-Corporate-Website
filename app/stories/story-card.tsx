"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MoreVertical, ImageIcon, Loader2, AlertCircle, Trash, Wand2, Pencil, Save, Sparkles } from "lucide-react";
import { Spinner } from "@/components/spinner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface StoryCardProps {
    segment: Doc<"segments">;
    storyId: Id<"story">;
    isVertical: boolean;
    characterLimit?: number;
    className?: string;
}

// Simple Prompt Editor Dialog Component (can be moved to a separate file)
function EditPromptDialog({
    isOpen,
    onOpenChange,
    segmentId,
    initialPrompt,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    segmentId: Id<"segments">;
    initialPrompt: string | null | undefined;
}) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [editedPrompt, setEditedPrompt] = useState(initialPrompt ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isPending, startTransition] = useTransition();

    const savePrompt = useMutation(api.segments.savePrompt);
    const regenerateImageMutation = useMutation(api.segments.regenerateImage);

    useEffect(() => {
        setEditedPrompt(initialPrompt ?? "");
    }, [initialPrompt]);

    const handleSave = async () => {
        if (editedPrompt.trim() === (initialPrompt ?? "").trim()) {
            toast({ title: t('noChangesDetected') });
            return;
        }
        setIsSaving(true);
        try {
            await savePrompt({ segmentId, prompt: editedPrompt });
            toast({ title: t('promptSaved') });
            onOpenChange(false);
        } catch (error) {
            toast({ title: t('error'), description: error instanceof Error ? error.message : t('savePromptFailed'), variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndRegenerate = () => {
        startTransition(async () => {
            setIsRegenerating(true);
            let promptWasSaved = false;
            try {
                if (editedPrompt.trim() !== (initialPrompt ?? "").trim()) {
                    await savePrompt({ segmentId, prompt: editedPrompt });
                    toast({ title: t('promptSaved') });
                    promptWasSaved = true;
                }
                await regenerateImageMutation({ segmentId });
                toast({ title: t('imageRegenerationStarted') });
                onOpenChange(false);
            } catch (error) {
                if (!(promptWasSaved && error instanceof Error && error.message.includes('regenerate'))) {
                    toast({ title: t('error'), description: error instanceof Error ? error.message : t('regenerationFailed'), variant: "destructive" });
                }
            } finally {
                setIsRegenerating(false);
            }
        });
    };

    const isProcessing = isSaving || isRegenerating || isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && onOpenChange(open)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('editImagePrompt')}</DialogTitle>
                    <DialogDescription>{t('editPromptDescription')}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="prompt">{t('prompt')}</Label>
                    <Textarea
                        id="prompt"
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="min-h-[100px] resize-y"
                        disabled={isProcessing}
                        placeholder={t('enterPrompt')}
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" disabled={isProcessing}>{t('cancel')}</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isProcessing || editedPrompt.trim() === (initialPrompt ?? "").trim()}>
                        {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('savePrompt')}
                    </Button>
                    <Button onClick={handleSaveAndRegenerate} disabled={isProcessing}>
                        {isRegenerating || isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {t('saveAndRegenerate')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function StoryCard({
    segment,
    storyId,
    isVertical,
    characterLimit = 750,
    className,
}: StoryCardProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isActionPending, startActionTransition] = useTransition();
    const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
    const updateSegmentText = useMutation(api.segments.updateSegmentText);
    const latestSegmentRef = useRef(segment);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- State for Text Editing ---
    const [isSavingText, setIsSavingText] = useState(false);
    const [currentText, setCurrentText] = useState(segment.text ?? "");
    const [justRefined, setJustRefined] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const imageStorageId = segment.image ?? segment.previewImage;
    const imageUrl = useQuery(
        api.segments.getImageUrl,
        imageStorageId
            ? { storageId: imageStorageId, segmentId: segment._id }
            : "skip"
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
                <div className="flex justify-between items-center p-3 bg-muted/30 border-b border-primary/10">
                    <span className="text-sm font-medium text-muted-foreground">
                        {t('segment')} {segment.order + 1}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isBusy}>
                                {isActionPending ? <Spinner className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                <span className="sr-only">{t('options')}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleRefineText} disabled={isBusy || !currentText.trim()}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                <span>{t('refineText')}</span>
                            </DropdownMenuItem>
                            {segment.image && (
                                <>
                                    <DropdownMenuItem onClick={handleRegenerateImage} disabled={isBusy}>
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        <span>{t('regenerateImage')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsPromptDialogOpen(true)} disabled={isBusy}>
                                        <Pencil className="mr-2 h-4 w-4" />
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
                            <DropdownMenuItem onClick={handleDeleteSegment} disabled={isBusy} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <Trash className="mr-2 h-4 w-4" />
                                <span>{t('deleteSegment')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Image Area */}
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
                    {imageUrl && !segment.isGenerating && !segment.error && (
                        <Image
                            src={imageUrl}
                            alt={`${t('segment')} ${segment.order + 1} image`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            priority={segment.order < 3}
                            unoptimized={!imageUrl.startsWith('/')}
                        />
                    )}
                    {!imageUrl && !segment.isGenerating && !segment.error && (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/40 to-muted/60 p-4 text-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">{t('noImageGenerated')}</p>
                            <Button variant="secondary" onClick={handleGenerateImage} disabled={!currentText.trim() || isBusy}>
                                <Wand2 className="mr-2 h-4 w-4" />
                                {t('generateImage')}
                            </Button>
                        </div>
                    )}
                    {/* Removed the PlusCircle button */}
                </div>

                {/* Text Area */}
                <CardContent className="p-3 flex-grow flex flex-col bg-muted/10">
                    <Textarea
                        ref={textareaRef}
                        value={currentText}
                        onChange={handleTextChange}
                        readOnly={isTextareaReadOnly}
                        className={cn(
                            "text-sm text-foreground flex-grow resize-none border-none focus-visible:ring-0",
                            "shadow-none bg-transparent min-h-[100px] p-1",
                            isTextareaReadOnly && "text-muted-foreground cursor-not-allowed",
                            // Add class for visual feedback on refine
                            justRefined && "transition-colors duration-1000 bg-primary/10"
                        )}
                        maxLength={characterLimit}
                        placeholder={t('writeSegmentText')}
                    />
                    <div className="text-right text-xs text-muted-foreground/70 mt-1 flex justify-end items-center h-4">
                        {isSavingText && <Spinner className="h-3 w-3 mr-1 animate-spin" />}
                        <span className={cn(charCount > characterLimit ? "text-destructive font-semibold" : "")}>
                            {charCount} / {characterLimit}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Prompt Editing Dialog (Conditional Rendering) */}
            {isPromptDialogOpen && fullSegment && (
                <EditPromptDialog
                    isOpen={isPromptDialogOpen}
                    onOpenChange={setIsPromptDialogOpen}
                    segmentId={segment._id}
                    initialPrompt={fullSegment.prompt}
                />
            )}
            {isPromptDialogOpen && !fullSegment && (
                <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="sr-only">{t('loadingPromptData')}</DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-8">
                            <Spinner />
                            <span className="ml-2">{t('loading')}</span>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}