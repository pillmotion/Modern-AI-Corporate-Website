"use client";

import { List, Pencil, Wand2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Generate() {
    const { t } = useTranslation();

    const services = [
        {
            icon: Pencil,
            title: t('IHaveAScriptReady'),
            description: t('IHaveAScriptReadyDesc'),
            href: '/generate/script',
            popular: false
        },
        {
            icon: Wand2,
            title: t('letAIWriteYourStory'),
            description: t('letAIWriteYourStoryDesc'),
            href: '/generate/guided',
            popular: true // 标记为 popular
        },
        {
            icon: List,
            title: t('createStorySegmentBySegment'),
            description: t('createStorySegmentBySegmentDesc'),
            href: '/generate/segment',
            popular: false
        },
    ];

    return (
        <div className="min-h-screen">
            <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8">
                <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg">
                    <CardHeader className="border-b border-primary/10 pb-4 md:pb-6">
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text text-transparent text-center">
                            {t('craftYourVideo')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 md:pt-6">
                        <div className="space-y-4 md:space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {services.map((service, index) => (
                                    <Link key={index} href={service.href} passHref>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                            viewport={{ once: true }}
                                            className="h-full"
                                        >
                                            {/* 添加 relative 类 */}
                                            <Card className={`relative group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 bg-gradient-to-br from-background to-primary/5 h-full flex flex-col cursor-pointer ${service.popular ? 'border-primary shadow-lg' : ''}`}>
                                                {/* 条件渲染 "Most Popular" 标签 */}
                                                {service.popular && (
                                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium shadow-md">
                                                            {t('mostPopular')}
                                                        </span>
                                                    </div>
                                                )}
                                                <CardHeader>
                                                    <div className="relative w-12 h-12 mb-4">
                                                        <motion.div
                                                            className="absolute inset-0 bg-primary/10 rounded-full"
                                                            animate={{
                                                                scale: [1, 1.2, 1],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                ease: "easeInOut",
                                                            }}
                                                        />
                                                        <service.icon className="w-12 h-12 text-primary relative z-10 group-hover:scale-110 transition-transform" />
                                                    </div>
                                                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                                                        {service.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-grow">
                                                    <p className="text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                                        {service.description}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
