"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/hooks/useTranslation';

const SERVICE_LIMITS = {
    minimax: 10000
};

const getGuidedGenerationSchema = (t: Function) => z.object({
    title: z.string().min(1, t('titleRequired')),
    description: z.string()
        .min(1, t('descriptionRequired'))
        .max(SERVICE_LIMITS.minimax, t('descriptionTooLong', { count: SERVICE_LIMITS.minimax }))
        .min(50, t('descriptionLength')),
});

type FormValues = z.infer<ReturnType<typeof getGuidedGenerationSchema>>;

export default function GuidedGenerate() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const guidedGenerationSchema = getGuidedGenerationSchema(t);
    const form = useForm<FormValues>({
        resolver: zodResolver(guidedGenerationSchema),
        defaultValues: {
            title: "",
            description: "",
        },
        mode: "onChange",
    });

    const generateGuidedStory = useMutation(
        api.guidedStory.generateGuidedStoryMutation
    );

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        setIsPending(true);
        generateGuidedStory(values)
            .then((newStoryId) => {
                router.push(`/stories/${newStoryId}/refine`);
                toast({
                    title: t("success"),
                    description: t("successDesc"),
                });
                form.reset();
            })
            .catch((error) => {
                console.error("Generation failed:", error);
                toast({
                    title: t("error"),
                    description: t("errorDesc"),
                    variant: "destructive",
                });
            })
            .finally(() => {
                setIsPending(false);
            });
    };

    const fillYTShortTemplate = () => {
        const title = form.getValues("title");
        const template = t('ytShortTemplate', { title });
        form.setValue("description", template, { shouldValidate: true });
    };

    const descriptionValue = form.watch("description");

    return (
        <div className="min-h-screen">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8">
                <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg">
                    <CardHeader className="border-b border-primary/10 pb-4 md:pb-6">
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text text-transparent text-center">
                            {t('guidedStoryCreation')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 md:pt-6">
                        <div className="space-y-4 md:space-y-8">
                            <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-md">
                                <CardHeader className="flex flex-row justify-between items-center space-y-0 p-6">
                                    <CardTitle className="text-lg md:text-xl bg-primary bg-clip-text text-transparent">
                                        {t('EnterAPrompt')}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            className="h-9 px-4 py-2 bg-primary"
                                            onClick={fillYTShortTemplate}
                                            disabled={isPending}
                                        >
                                            {t('YTShortButton')}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 pt-0">
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                            {/* Title Field */}
                                            <FormField
                                                control={form.control}
                                                name="title"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                            {t('titleLabel')}
                                                            <span className="text-xs text-muted-foreground"> ({t('titleHint')})</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder={t('titlePlaceholder')}
                                                                {...field}
                                                                disabled={isPending}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Description Field */}
                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                            {t('storyDescriptionLabel')}
                                                        </FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Textarea
                                                                    placeholder={t('descriptionPlaceholder')}
                                                                    className="min-h-[120px] md:min-h-[200px] bg-background/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300 resize-none text-sm md:text-base"
                                                                    maxLength={SERVICE_LIMITS.minimax}
                                                                    {...field}
                                                                    disabled={isPending}
                                                                />
                                                            </FormControl>
                                                            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                                                {(descriptionValue || "").length}/{SERVICE_LIMITS.minimax.toLocaleString()} {t('characters')}
                                                            </div>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {/* Submit Button */}
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="submit"
                                                    className="flex-1 h-10 text-sm bg-primary transition-all duration-300"
                                                    disabled={isPending}
                                                >
                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                    {isPending ? t('generatingButton') : t('generateGuidedStoryButton')}
                                                    {!isPending && ` (1 ${t('credits')})`}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}