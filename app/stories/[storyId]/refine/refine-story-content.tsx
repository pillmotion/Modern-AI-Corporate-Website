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
import { CREDIT_COSTS, SERVICE_LIMITS } from "@/convex/constants";
import { Button } from "@/components/ui/button";
import { Wand2, Sparkles, Save, Smartphone, Monitor } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input"
import useMediaQuery from "@/hooks/use-media-query";
import { analyzeTextAndEstimateDuration, debounce } from "@/lib/utils";

export function RefineStoryContent() {
    const { t } = useTranslation();
    const params = useParams();
    const storyId = params.storyId as Id<"story">;
    const story = useQuery(api.story.getStory, storyId ? { storyId } : "skip");
    const router = useRouter();
    const { isMobile } = useMediaQuery();

    const [scriptValue, setScriptValue] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [isVertical, setIsVertical] = useState<boolean>(true);
    const [isRefineDialogOpen, setIsRefineDialogOpen] = useState(false);
    const [refinementInstruction, setRefinementInstruction] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

    const updateStoryScript = useMutation(
        api.guidedStory.updateStoryScriptPublic,
    );

    const scheduleRefinement = useMutation(api.guidedStory.refineStoryMutation);

    const generateSegments = useMutation(
        api.guidedStory.generateSegmentsMutation,
    );

    const debouncedUpdate = useCallback(
        debounce(async (newScript: string) => {
            setIsSaving(true);
            try {
                await updateStoryScript({ storyId, script: newScript });
            } catch (error) {
                console.error("Failed to save script:", error);
            } finally {
                setIsSaving(false);
            }
        }, 1000),
        [storyId, updateStoryScript]
    );

    useEffect(() => {
        return () => {
            debouncedUpdate.cancel();
        };
    }, [debouncedUpdate]);

    // 效果2: 同步来自后端的更新 (如果需要自动更新 Textarea)
    const previousStoryScriptRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (story && hasInitialized && story.script !== previousStoryScriptRef.current) {
            if (!isSaving) {
                setScriptValue(story.script);
            }
        }
        previousStoryScriptRef.current = story?.script;

    }, [story?.script, hasInitialized, isSaving]);

    // 效果1: 初始化 (只运行一次)
    useEffect(() => {
        if (story && !hasInitialized) {
            setScriptValue(story.script);
            setIsVertical(story.isVertical ?? true);
            setHasInitialized(true);
        }
    }, [story, hasInitialized]);

    if (story === undefined) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner className="w-8 h-8" />
                <span className="ml-2 text-primary">{t('loading')}</span>
            </div>
        );
    }

    if (story === null) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>{t('storyNotFound')}</p>
            </div>
        );
    }

    const handleScriptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newScript = event.target.value;
        setScriptValue(newScript);
        debouncedUpdate(newScript);
    };

    const handleConfirmRefine = async () => {
        if (!refinementInstruction.trim() || story?.status === 'processing') return;

        setIsRefineDialogOpen(false);

        try {
            // 调用后端 mutation
            await scheduleRefinement({
                storyId,
                refinement: refinementInstruction,
            });

            setRefinementInstruction("");
        } catch (error) {
            console.error("Failed to schedule refinement:", error);
        }
    };

    const handleGenerateSegments = async () => {
        if (isGenerating || isSaving || story?.status === 'processing' || !scriptValue.trim()) return;
        setIsGenerateDialogOpen(false);
        setIsGenerating(true);
        try {
            await generateSegments({ storyId, isVertical });
            router.push(`/stories/${storyId}`);
        } catch (error) {
            console.error("Failed to initiate segment generation:", error);
            setIsGenerating(false);
        }
    };

    const analysisResult = analyzeTextAndEstimateDuration(scriptValue);

    const charCount = analysisResult.characterCount;
    const durationParts = analysisResult.duration;

    const formatDurationString = (duration: { minutes: number, seconds: number }): string => {
        const { minutes, seconds } = duration;
        if (minutes === 0 && seconds === 0) {
            return t('durationSecondsOnly', { count: 0 });
        } else if (minutes === 0) {
            return t('durationSecondsOnly', { count: seconds });
        } else if (seconds === 0) {
            return t('durationMinutesOnly', { count: minutes });
        } else {
            return t('durationMinutesAndSeconds', { minutes: minutes, seconds: seconds });
        }
    };

    const estimatedVideoLength = formatDurationString(durationParts);

    const estimatedSegments = scriptValue.split(/\n{2,}/).filter(Boolean).length;
    const estimatedCredits = estimatedSegments * CREDIT_COSTS.IMAGE_GENERATION;

    // --- 根据设备选择 Dialog 或 Drawer ---
    const RefineWrapper = isMobile ? Drawer : Dialog;
    const RefineTrigger = isMobile ? DrawerTrigger : DialogTrigger;
    const RefineContent = isMobile ? DrawerContent : DialogContent;
    const RefineHeader = isMobile ? DrawerHeader : DialogHeader;
    const RefineTitle = isMobile ? DrawerTitle : DialogTitle;
    const RefineDescription = isMobile ? DrawerDescription : DialogDescription;
    const RefineFooter = isMobile ? DrawerFooter : DialogFooter;
    const RefineClose = isMobile ? DrawerClose : DialogClose;

    const GenerateWrapper = isMobile ? Drawer : Dialog;
    const GenerateTrigger = isMobile ? DrawerTrigger : DialogTrigger;
    const GenerateContent = isMobile ? DrawerContent : DialogContent;
    const GenerateHeader = isMobile ? DrawerHeader : DialogHeader;
    const GenerateTitle = isMobile ? DrawerTitle : DialogTitle;
    const GenerateDescription = isMobile ? DrawerDescription : DialogDescription;
    const GenerateFooter = isMobile ? DrawerFooter : DialogFooter;
    const GenerateClose = isMobile ? DrawerClose : DialogClose;

    return (
        <div className="min-h-screen">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8">
                <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg">
                    <CardHeader className="border-b border-primary/10 pb-4 md:pb-6">
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text text-transparent text-center">
                            {t('refineYourStory')}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground flex items-center">
                            {isSaving && <><Spinner className="w-4 h-4 mr-1" />{t('saving')}</>}
                            {!isSaving && hasInitialized && <><Save className="w-4 h-4 mr-1 text-green-500" />{t('saved')}</>}
                        </div>
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
                                            className="min-h-[280px] md:min-h-[350px] bg-background/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300 resize-none text-sm md:text-base"
                                            maxLength={SERVICE_LIMITS.minimax}
                                            value={scriptValue}
                                            onChange={handleScriptChange}
                                            disabled={isSaving || story?.status === 'processing' || isGenerating}
                                            placeholder={t('writeOrPasteStory')}
                                        />
                                        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                                            {t('estimatedVideoLengthLabel')}: {estimatedVideoLength}
                                        </div>
                                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                            {charCount}/{SERVICE_LIMITS.minimax.toLocaleString()} {t('characters')}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <RefineWrapper open={isRefineDialogOpen} onOpenChange={(isOpen) => { setIsRefineDialogOpen(isOpen); if (!isOpen) setRefinementInstruction(""); }}>
                                            <RequireAuth>
                                                <RefineTrigger asChild>
                                                    <Button
                                                        disabled={isSaving || story?.status === 'processing' || isGenerating || !scriptValue.trim()}
                                                        className="flex-1 h-10 text-sm bg-primary transition-all duration-300"
                                                    >
                                                        {story?.status === 'processing' ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                                        {t('refineStory')}
                                                    </Button>
                                                </RefineTrigger>
                                            </RequireAuth>
                                            <RefineContent className={isMobile ? "" : "sm:max-w-[425px]"}>
                                                <RefineHeader className={isMobile ? "text-left" : ""}>
                                                    <RefineTitle>{t('refineYourStory')}</RefineTitle>
                                                    <RefineDescription>
                                                        {t('enterRefinementInstruction', { count: CREDIT_COSTS.CHAT_COMPLETION })}
                                                    </RefineDescription>
                                                </RefineHeader>
                                                <div className="grid gap-4 py-4 px-4 sm:px-0">
                                                    <Input
                                                        id="refinement"
                                                        placeholder={t('refinementPlaceholder')}
                                                        value={refinementInstruction}
                                                        onChange={(e) => setRefinementInstruction(e.target.value)}
                                                    />
                                                </div>
                                                <RefineFooter className={isMobile ? "pt-2" : ""}>
                                                    <RefineClose asChild>
                                                        <Button type="button" variant={isMobile ? "outline" : "secondary"}>
                                                            {t('cancel')}
                                                        </Button>
                                                    </RefineClose>
                                                    <Button
                                                        type="button"
                                                        onClick={handleConfirmRefine}
                                                        disabled={!refinementInstruction.trim() || story?.status === 'processing'}
                                                    >
                                                        {t('refine')}
                                                    </Button>
                                                </RefineFooter>
                                            </RefineContent>
                                        </RefineWrapper>
                                        <GenerateWrapper open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                                            <RequireAuth>
                                                <GenerateTrigger asChild>
                                                    <Button
                                                        disabled={isSaving || story?.status === 'processing' || isGenerating || !scriptValue.trim()}
                                                        variant="outline"
                                                        className="flex-1 h-10 text-sm border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                                                    >
                                                        {isGenerating ? <Spinner className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                        {t('generateSegments')}
                                                    </Button>
                                                </GenerateTrigger>
                                            </RequireAuth>

                                            <GenerateContent className={isMobile ? "" : "sm:max-w-[480px]"}>
                                                <GenerateHeader className={isMobile ? "text-left" : ""}>
                                                    <GenerateTitle>{t('chooseVideoOrientationTitle')}</GenerateTitle>
                                                    <GenerateDescription>
                                                        {t('chooseVideoOrientationDesc1')} <br />
                                                        {t('chooseVideoOrientationDesc2')}
                                                    </GenerateDescription>
                                                </GenerateHeader>

                                                <div className="grid gap-4 py-4 px-4 sm:px-6">
                                                    <div className="flex gap-4 justify-center">
                                                        <Button
                                                            variant={isVertical ? "default" : "outline"}
                                                            onClick={() => setIsVertical(true)}
                                                            className="flex-1 flex items-center gap-2"
                                                            disabled={story?.status === 'processing' || isGenerating}
                                                        >
                                                            <Smartphone className="h-4 w-4" />
                                                            {t('orientationVertical')}
                                                        </Button>
                                                        <Button
                                                            variant={!isVertical ? "default" : "outline"}
                                                            onClick={() => setIsVertical(false)}
                                                            className="flex-1 flex items-center gap-2"
                                                            disabled={story?.status === 'processing' || isGenerating}
                                                        >
                                                            <Monitor className="h-4 w-4" />
                                                            {t('orientationHorizontal')}
                                                        </Button>
                                                    </div>
                                                    <p className="text-sm text-red-500 text-center mt-2">
                                                        {t('orientationChangeWarning')}
                                                    </p>
                                                </div>

                                                <GenerateFooter className={isMobile ? "pt-2" : ""}>
                                                    <GenerateClose asChild>
                                                        <Button type="button" variant={isMobile ? "outline" : "secondary"} disabled={isGenerating}>
                                                            {t('cancel')}
                                                        </Button>
                                                    </GenerateClose>
                                                    <Button
                                                        type="button"
                                                        onClick={handleGenerateSegments}
                                                        disabled={story?.status === 'processing' || isGenerating || !scriptValue.trim()}
                                                    >
                                                        {isGenerating && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                                                        {t('generateWithCredits', { count: estimatedCredits })}
                                                    </Button>
                                                </GenerateFooter>
                                            </GenerateContent>
                                        </GenerateWrapper>
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