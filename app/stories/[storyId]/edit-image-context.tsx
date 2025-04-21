"use client";

import { useState, useEffect } from "react";
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
    DialogTrigger, // Needed if you have an external trigger, maybe not here
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Wand2 } from "lucide-react";
import { CREDIT_COSTS } from "@/convex/constants"; // Adjust path if needed
// --- Import useMediaQuery hook ---
import useMediaQuery from "@/hooks/use-media-query";

interface EditImageContextDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    storyId: Id<"story">;
    initialContext: string | null | undefined;
}

export function EditImageContextDialog({
    isOpen,
    onOpenChange,
    storyId,
    initialContext,
}: EditImageContextDialogProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [editedContext, setEditedContext] = useState<string>("");
    const [isSavingContext, setIsSavingContext] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const { isMobile } = useMediaQuery();

    const updateContextMutation = useMutation(api.story.updateUserStoryContext);
    const regenerateContextMutation = useMutation(api.story.regenerateStoryContext);

    useEffect(() => {
        if (!isSavingContext && !isRegenerating) {
            setEditedContext(initialContext ?? "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialContext, isOpen]);

    const handleSaveContext = async () => {
        if (isRegenerating) return;

        const currentContext = initialContext ?? "";
        if (editedContext.trim() === currentContext.trim()) {
            toast({ title: t('noChangesDetected') });
            onOpenChange(false);
            return;
        }

        setIsSavingContext(true);
        try {
            await updateContextMutation({
                storyId: storyId,
                context: editedContext,
            });
            toast({ title: t('saveContextSuccess') });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save context:", error);
            toast({ title: t('saveContextError'), description: error instanceof Error ? error.message : undefined, variant: "destructive" });
        } finally {
            setIsSavingContext(false);
        }
    };

    const handleRegenerateContext = async () => {
        if (isSavingContext) return;

        setIsRegenerating(true);
        try {
            await regenerateContextMutation({ storyId });
            toast({ title: t('regenerateContextStarted') });

        } catch (error) {
            console.error("Failed to schedule context regeneration:", error);
            toast({ title: t('regenerateContextError'), description: error instanceof Error ? error.message : undefined, variant: "destructive" });
            setIsRegenerating(false);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!isSavingContext && !isRegenerating) {
            onOpenChange(open);
        }
    };

    const isProcessing = isSavingContext || isRegenerating;
    const isContextUnchanged = editedContext.trim() === (initialContext ?? "").trim();

    const EditContextWrapper = isMobile ? Drawer : Dialog;
    const EditContextContent = isMobile ? DrawerContent : DialogContent;
    const EditContextHeader = isMobile ? DrawerHeader : DialogHeader;
    const EditContextTitle = isMobile ? DrawerTitle : DialogTitle;
    const EditContextDescription = isMobile ? DrawerDescription : DialogDescription;
    const EditContextFooter = isMobile ? DrawerFooter : DialogFooter;
    const EditContextClose = isMobile ? DrawerClose : DialogClose;

    return (
        // The wrapper component handles open state
        <EditContextWrapper open={isOpen} onOpenChange={handleOpenChange}>
            {/* If the trigger button is *outside* this component, you don't need a Trigger here.
                 If the trigger *is* this component (e.g., wrapping a button), use EditContextTrigger.
                 Assuming trigger is external for now. */}

            <EditContextContent className={isMobile ? "" : "sm:max-w-[525px]"}>
                <EditContextHeader className={isMobile ? "text-left" : ""}>
                    <EditContextTitle>{t('editContextTitle')}</EditContextTitle>
                    <EditContextDescription>{t('editContextDescription')}</EditContextDescription>
                </EditContextHeader>

                {/* Use padding within the content sections for mobile Drawer */}
                <div className={`py-4 space-y-2 ${isMobile ? 'px-4' : ''}`}>
                    <Label htmlFor="context-textarea-dialog" className="text-left font-semibold">
                        {t('currentContext')}
                    </Label>
                    <Textarea
                        id="context-textarea-dialog"
                        value={editedContext}
                        onChange={(e) => setEditedContext(e.target.value)}
                        className="min-h-[120px] resize-y"
                        disabled={isProcessing}
                        placeholder={t('contextHelperText')}
                    />
                </div>

                <EditContextFooter className={`gap-2 ${isMobile ? "flex-col-reverse sm:flex-row" : "sm:gap-2 sm:justify-end"}`}>
                    {/* Cancel Button (First on Desktop, Bottom on Mobile Column-Reverse) */}
                    <EditContextClose asChild>
                        <Button
                            type="button"
                            variant="outline" // Consistent outline
                            disabled={isProcessing}
                            className={isMobile ? "" : ""} // Remove flex-1 if not needed
                        >
                            {t('cancel')}
                        </Button>
                    </EditContextClose>
                    {/* Regenerate Button (Middle - Secondary Action) */}
                    <Button
                        type="button"
                        variant="secondary" // Secondary style
                        onClick={handleRegenerateContext}
                        disabled={isProcessing}
                        className={isMobile ? "" : ""}
                    >
                        {isRegenerating ? <Spinner className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {t('regenerateContext')} ({CREDIT_COSTS.CHAT_COMPLETION} {t('credits')})
                    </Button>
                    {/* Save Button (Last on Desktop, Top on Mobile Column-Reverse - Primary Action) */}
                    <Button
                        type="button"
                        onClick={handleSaveContext}
                        disabled={isProcessing || isContextUnchanged}
                        className={isMobile ? "" : ""} // Default variant
                    >
                        {isSavingContext ? <Spinner className="mr-2 h-4 w-4" /> : null}
                        {t('saveContext')}
                    </Button>
                </EditContextFooter>
            </EditContextContent>
        </EditContextWrapper>
    );
}