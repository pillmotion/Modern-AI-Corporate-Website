"use client";

import { Globe, Code, Newspaper, Mic2, Navigation, Briefcase } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';

export default function Generate() {
    const { t } = useTranslation();

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
                            <div className="container">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    viewport={{ once: true }}
                                >
                                    <h2 className="text-3xl font-bold text-center mb-12">
                                        <span className="text-primary">
                                            {t('ourServices')}
                                        </span>
                                    </h2>
                                </motion.div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        {
                                            icon: Newspaper,
                                            title: t('aiNewsTitle'),
                                            description: t('aiNewsDesc')
                                        },
                                        {
                                            icon: Briefcase,
                                            title: t('aiResearchTitle'),
                                            description: t('aiResearchDesc')
                                        },
                                        {
                                            icon: Code,
                                            title: t('aiProgrammingTitle'),
                                            description: t('aiProgrammingDesc')
                                        },
                                        {
                                            icon: Navigation,
                                            title: t('aiNavigatorTitle'),
                                            description: t('aiNavigatorDesc')
                                        },
                                        {
                                            icon: Globe,
                                            title: t('aiTranslationTitle'),
                                            description: t('aiTranslationDesc')
                                        },
                                        {
                                            icon: Mic2,
                                            title: t('aiVoiceTitle'),
                                            description: t('aiVoiceDesc')
                                        }
                                    ].map((service, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                            viewport={{ once: true }}
                                        >
                                            <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 bg-gradient-to-br from-background to-primary/5 h-full flex flex-col">
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
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
