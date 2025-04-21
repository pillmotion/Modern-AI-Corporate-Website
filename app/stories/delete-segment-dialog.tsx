"use client";

import React, { useState } from "react";
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
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/spinner";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AlertTriangle, Trash } from "lucide-react";
import useMediaQuery from "@/hooks/use-media-query"; // Adjust path if needed

interface DeleteSegmentDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    segmentId: Id<"segments">;
    segmentOrder: number; // For display purposes
}

export function DeleteSegmentDialog({
    isOpen,
    onOpenChange,
    segmentId,
    segmentOrder,
}: DeleteSegmentDialogProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const { isMobile } = useMediaQuery();

    const deleteSegmentMutation = useMutation(api.segments.deleteSegment);

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteSegmentMutation({ segmentId });
            toast({ title: t('segmentDeleted') });
            onOpenChange(false); // Close on success
        } catch (error) {
            console.error("Failed to delete segment:", error);
            toast({ title: t('error'), description: error instanceof Error ? error.message : t('deleteFailed'), variant: "destructive" });
            // Keep dialog open on error? Or close? Closing might be better still.
            // onOpenChange(false);
        } finally {
            setIsDeleting(false);
        }
    };

    // Prevent closing while processing
    const handleOpenChange = (open: boolean) => {
        if (!isDeleting) {
            onOpenChange(open);
        }
    };

    // --- Define Aliases ---
    const DeleteWrapper = isMobile ? Drawer : Dialog;
    const DeleteContent = isMobile ? DrawerContent : DialogContent;
    const DeleteHeader = isMobile ? DrawerHeader : DialogHeader;
    const DeleteTitle = isMobile ? DrawerTitle : DialogTitle;
    const DeleteDescription = isMobile ? DrawerDescription : DialogDescription;
    const DeleteFooter = isMobile ? DrawerFooter : DialogFooter;
    const DeleteClose = isMobile ? DrawerClose : DialogClose;

    return (
        <DeleteWrapper open={isOpen} onOpenChange={handleOpenChange}>
            <DeleteContent className={isMobile ? "" : "sm:max-w-md"}>
                <DeleteHeader className={isMobile ? "text-left" : ""}>
                    <DeleteTitle className="flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5 text-destructive" aria-hidden="true" />
                        {t('deleteSegmentTitle')}
                    </DeleteTitle>
                    <DeleteDescription>
                        {t('deleteSegmentConfirmation', { order: segmentOrder + 1 })} <br />
                        {t('cannotBeUndone')}
                    </DeleteDescription>
                </DeleteHeader>

                {/* Optional: Add segment preview text here if needed */}
                {/* <div className={`py-4 ${isMobile ? 'px-4' : ''}`}> ... </div> */}

                <DeleteFooter className={`gap-2 ${isMobile ? "flex-col-reverse sm:flex-row" : "sm:gap-2 sm:justify-end"}`}>
                    <DeleteClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            className={isMobile ? "" : ""}
                        >
                            {t('cancel')}
                        </Button>
                    </DeleteClose>
                    <Button
                        type="button"
                        variant="destructive" // Destructive variant for delete
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className={isMobile ? "" : ""}
                    >
                        {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : <Trash className="mr-2 h-4 w-4" />}
                        {t('delete')}
                    </Button>
                </DeleteFooter>
            </DeleteContent>
        </DeleteWrapper>
    );
}