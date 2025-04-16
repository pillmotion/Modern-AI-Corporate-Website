"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslation } from '@/hooks/useTranslation';
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

const SERVICE_LIMITS = {
    minimax: 10000  // Minimax 最大支持 10,000 字符
};

export default function Generate() {
    const { t } = useTranslation();
    const [text, setText] = useState("");

    // 处理文本输入，限制字符数
    const handleTextChange = (value: string) => {
        setText(value);
    };

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
                                <CardHeader className="space-y-1 md:space-y-2">
                                    <CardTitle className="text-lg md:text-xl bg-primary bg-clip-text text-transparent">
                                        {t('EnterAPrompt')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4">
                                    <div className="relative">
                                        <Textarea
                                            placeholder={t('inputPlaceholder')}
                                            className="min-h-[120px] md:min-h-[200px] bg-background/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300 resize-none text-sm md:text-base"
                                            value={text}
                                            onChange={(e) => handleTextChange(e.target.value)}
                                            maxLength={SERVICE_LIMITS.minimax}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                            {text.length}/{SERVICE_LIMITS.minimax.toLocaleString()} {t('characters')}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            className="flex-1 h-10 text-sm bg-primary transition-all duration-300"
                                        >
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            {t('generateGuidedStoryButton')}
                                        </Button>
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
