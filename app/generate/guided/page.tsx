"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useForm, type SubmitHandler } from "react-hook-form"; // 导入 react-hook-form
import { zodResolver } from "@hookform/resolvers/zod"; // 导入 zodResolver
import { z } from "zod"; // 导入 zod
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // 导入 Form 组件
import { useMutation } from "convex/react"; // 导入 Convex hook
import { api } from "@/convex/_generated/api"; // 导入 Convex API (确保路径正确)
import { useRouter } from "next/navigation"; // 导入 Next.js router
import { useToast } from "@/hooks/use-toast"; // 导入 shadcn toast
import { useTranslation } from '@/hooks/useTranslation';

const SERVICE_LIMITS = {
    minimax: 10000  // Minimax 最大支持 10,000 字符
};

// 定义 Zod Schema (移入组件内部或保持在外部)
// 注意：确保 t() 函数能正确处理这些 key，或调整 key 的格式
const getGuidedGenerationSchema = (t: Function) => z.object({
    // 使用函数获取 schema 以便传入 t 函数
    title: z.string().min(1, t('titleRequired')),
    description: z.string()
        .min(1, t('descriptionRequired')) // 添加一个最小长度或非空校验
        .max(SERVICE_LIMITS.minimax, t('descriptionTooLong', { count: SERVICE_LIMITS.minimax })) // 添加最大长度校验
        .min(50, t('descriptionLength')), // 保留原有的最小 50 字符校验
});

type FormValues = z.infer<ReturnType<typeof getGuidedGenerationSchema>>;

export default function Generate() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false); // 状态：处理 API 请求中
    const router = useRouter();
    const { toast } = useToast();

    const guidedGenerationSchema = getGuidedGenerationSchema(t); // 获取 schema 实例
    const form = useForm<FormValues>({
        resolver: zodResolver(guidedGenerationSchema),
        defaultValues: {
            title: "",
            description: "",
        },
        mode: "onChange", // 可选：实时校验
    });

    const generateGuidedStory = useMutation(
        api.guidedStory.generateGuidedStoryMutation // 确保 API 路径正确
    );

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        setIsPending(true);
        generateGuidedStory(values)
            .then((newStoryId) => {
                // 假设 newStoryId 是字符串类型
                router.push(`/stories/${newStoryId}/refine`); // 导航到新页面
                toast({
                    title: t("success"),
                    description: t("successDesc"),
                });
                form.reset(); // 重置表单
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
                setIsPending(false); // 结束 pending 状态
            });
    };

    const fillYTShortTemplate = () => {
        const title = form.getValues("title"); // 从 react-hook-form 获取 title
        // 注意：确保 t() 能正确处理模板字符串中的 key
        const template = t('ytShortTemplate', { title });
        form.setValue("description", template, { shouldValidate: true }); // 设置 description 并触发校验
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
                                    {/* 恢复原始的 CardTitle 样式 */}
                                    <CardTitle className="text-lg md:text-xl bg-primary bg-clip-text text-transparent">
                                        {t('EnterAPrompt')}
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button" // 明确类型为 button
                                            className="h-9 px-4 py-2 bg-primary"
                                            onClick={fillYTShortTemplate} // 调用模板填充函数
                                            disabled={isPending} // 在 pending 时禁用
                                        >
                                            {t('YTShortButton')} {/* 使用 t() 翻译 */}
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
                                                                {...field} // 绑定 react-hook-form
                                                                disabled={isPending} // 在 pending 时禁用
                                                            />
                                                        </FormControl>
                                                        <FormMessage /> {/* 显示校验错误信息 */}
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
                                                        {/* 将 Textarea 和字符计数器包裹在一个 relative 定位的 div 中 */}
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Textarea
                                                                    placeholder={t('descriptionPlaceholder')} // 更新 placeholder key
                                                                    className="min-h-[120px] md:min-h-[200px] bg-background/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300 resize-none text-sm md:text-base"
                                                                    maxLength={SERVICE_LIMITS.minimax} // 保留 maxLength 视觉提示
                                                                    {...field} // 绑定 react-hook-form
                                                                    disabled={isPending} // 在 pending 时禁用
                                                                />
                                                            </FormControl>
                                                            {/* 恢复字符计数器 - 使用 form.watch 的值 */}
                                                            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                                                {(descriptionValue || "").length}/{SERVICE_LIMITS.minimax.toLocaleString()} {t('characters')}
                                                            </div>
                                                        </div>
                                                        <FormMessage /> {/* 显示校验错误信息 */}
                                                    </FormItem>
                                                )}
                                            />
                                            {/* Submit Button */}
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="submit" // 类型为 submit
                                                    className="flex-1 h-10 text-sm bg-primary transition-all duration-300" // 保留原有样式
                                                    disabled={isPending} // 根据 pending 状态禁用
                                                >
                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                    {/* 根据 pending 状态显示不同文本 */}
                                                    {isPending ? t('generatingButton') : t('generateGuidedStoryButton')}
                                                    {/* 添加积分提示 (可选) */}
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