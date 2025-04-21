"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
// --- Import Drawer components ---
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    // DialogTrigger, // Likely not needed if trigger is external
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Save, Wand2 } from "lucide-react";
import { CREDIT_COSTS } from "@/convex/constants"; // Adjust path if needed
// --- Import useMediaQuery hook ---
import useMediaQuery from "@/hooks/use-media-query"; // Adjust path if needed

interface EditPromptDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    segmentId: Id<"segments">;
    initialPrompt: string | null | undefined;
}

export function EditPromptDialog({
    isOpen,
    onOpenChange,
    segmentId,
    initialPrompt,
}: EditPromptDialogProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [editedPrompt, setEditedPrompt] = useState(initialPrompt ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isPending, startTransition] = useTransition();
    // --- Use the hook ---
    const { isMobile } = useMediaQuery();

    const savePrompt = useMutation(api.segments.savePrompt);
    const regenerateImageMutation = useMutation(api.segments.regenerateImage);

    useEffect(() => {
        // Only update if not saving/regenerating to avoid overwriting user input during async ops
        if (!isSaving && !isRegenerating) {
            setEditedPrompt(initialPrompt ?? "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPrompt, isOpen]); // Also update when dialog re-opens

    const handleSave = async () => {
        if (isRegenerating || isPending) return;
        if (editedPrompt.trim() === (initialPrompt ?? "").trim()) {
            toast({ title: t('noChangesDetected') });
            onOpenChange(false); // Close even if no changes
            return;
        }
        setIsSaving(true);
        try {
            await savePrompt({ segmentId, prompt: editedPrompt });
            toast({ title: t('promptSaved') });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save prompt:", error);
            toast({ title: t('error'), description: error instanceof Error ? error.message : t('savePromptFailed'), variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndRegenerate = () => {
        if (isSaving) return; // Prevent if already saving manually
        startTransition(async () => {
            setIsRegenerating(true);
            let promptWasSaved = false;
            try {
                // Save prompt only if it has actually changed
                if (editedPrompt.trim() !== (initialPrompt ?? "").trim()) {
                    await savePrompt({ segmentId, prompt: editedPrompt });
                    toast({ title: t('promptSaved') });
                    promptWasSaved = true;
                }
                // Always attempt regeneration after potential save
                await regenerateImageMutation({ segmentId });
                toast({ title: t('imageRegenerationStarted') });
                onOpenChange(false); // Close dialog after scheduling
            } catch (error) {
                console.error("Save and regenerate failed:", error);
                // Avoid double errors if save worked but regenerate failed
                if (!(promptWasSaved && error instanceof Error && error.message.includes('regenerate'))) {
                    toast({ title: t('error'), description: error instanceof Error ? error.message : t('regenerationFailed'), variant: "destructive" });
                }
                // Keep dialog open on error? Or close? Closing is simpler.
                // onOpenChange(false);
            } finally {
                setIsRegenerating(false);
            }
        });
    };

    const isProcessing = isSaving || isRegenerating || isPending;

    // --- Define Aliases ---
    const EditPromptWrapper = isMobile ? Drawer : Dialog;
    const EditPromptContent = isMobile ? DrawerContent : DialogContent;
    const EditPromptHeader = isMobile ? DrawerHeader : DialogHeader;
    const EditPromptTitle = isMobile ? DrawerTitle : DialogTitle;
    const EditPromptDescription = isMobile ? DrawerDescription : DialogDescription;
    const EditPromptFooter = isMobile ? DrawerFooter : DialogFooter;
    const EditPromptClose = isMobile ? DrawerClose : DialogClose;

    // Prevent closing while processing
    const handleOpenChange = (open: boolean) => {
        if (!isProcessing) {
            onOpenChange(open);
        }
    };

    return (
        <EditPromptWrapper open={isOpen} onOpenChange={handleOpenChange}>
            <EditPromptContent className={isMobile ? "" : "sm:max-w-lg"}> {/* Changed md to lg */}
                <EditPromptHeader className={isMobile ? "text-left" : ""}>
                    <EditPromptTitle>{t('editImagePrompt')}</EditPromptTitle>
                    <EditPromptDescription>{t('editPromptDescription')}</EditPromptDescription>
                </EditPromptHeader>

                {/* Add padding for mobile drawer content */}
                <div className={`py-4 space-y-2 ${isMobile ? 'px-4' : ''}`}>
                    <Label htmlFor="prompt-dialog-textarea">{t('prompt')}</Label> {/* Unique ID */}
                    <Textarea
                        id="prompt-dialog-textarea"
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="min-h-[100px] resize-y"
                        disabled={isProcessing}
                        placeholder={t('enterPrompt')}
                    />
                </div>

                {/* Adjust footer layout for mobile/desktop */}
                <EditPromptFooter className={`gap-2 ${isMobile ? "flex-col-reverse sm:flex-row" : "sm:gap-2 sm:justify-end"}`}>
                    {/* Cancel Button */}
                    <EditPromptClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isProcessing}
                            className={isMobile ? "" : ""}
                        >
                            {t('cancel')}
                        </Button>
                    </EditPromptClose>
                    {/* Save Prompt Button (Secondary) */}
                    <Button
                        onClick={handleSave}
                        variant="secondary"
                        disabled={isProcessing || editedPrompt.trim() === (initialPrompt ?? "").trim()}
                        className={isMobile ? "" : ""}
                    >
                        {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('savePrompt')}
                    </Button>
                    {/* Save and Regenerate Button (Primary) */}
                    <Button
                        onClick={handleSaveAndRegenerate}
                        disabled={isProcessing}
                        className={isMobile ? "" : ""} // Default variant
                    >
                        {isRegenerating || isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {t('saveAndRegenerate')} ({CREDIT_COSTS.IMAGE_GENERATION} {t('credits')})
                    </Button>
                </EditPromptFooter>
            </EditPromptContent>
        </EditPromptWrapper>
    );
}
