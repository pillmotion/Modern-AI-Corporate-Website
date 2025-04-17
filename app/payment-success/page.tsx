'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation'; // 确保路径正确
import { useToast } from '@/hooks/use-toast'; // 确保路径正确
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

export default function PaymentSuccessPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [showConfettiEffect, setShowConfettiEffect] = useState(false);

    // 从 URL 获取参数 (可选，主要用于 toast)
    const type = searchParams.get('type');
    // const sessionId = searchParams.get('session_id'); 

    const triggerConfetti = () => {
        // (复制 ProfilePage 中的 confetti 代码)
        const end = Date.now() + 1500; // Increase duration slightly
        const colors = ['#4F46E5', '#7C3AED', '#EC4899', '#10B981', '#F59E0B']; // Add more colors

        (function frame() {
            confetti({
                particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: colors
            });
            confetti({
                particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: colors
            });
            if (Date.now() < end) { requestAnimationFrame(frame); }
        }());
    };

    useEffect(() => {
        // 这个页面加载就意味着支付流程初步成功（用户被重定向了）
        setShowConfettiEffect(true);
        triggerConfetti();

        // 显示 Toast 消息
        let toastMessage = {
            title: t('paymentSuccessTitle') || "Payment Successful!", // 添加翻译键
            description: t('paymentSuccessDesc') || "Your credits will be updated shortly." // 添加翻译键
        };

        // 可以根据 type 显示更具体的消息 (可选)
        if (type === 'thousandCredits') {
            toastMessage.description = t('thousandCreditsAdded') || "1,000 Credits added! Refreshing soon.";
        } else if (type === 'tenThousandCredits') {
            toastMessage.description = t('tenThousandCreditsAdded') || "10,000 Credits added! Refreshing soon.";
        } // ... etc.

        toast({
            title: toastMessage.title,
            description: toastMessage.description,
            variant: "default", // Or maybe a success variant if you have one
            duration: 6000,
        });

        // 可选：一段时间后自动跳转回首页或 profile
        // const timer = setTimeout(() => {
        //   router.push('/'); 
        // }, 7000); 
        // return () => clearTimeout(timer);

        // 清理 URL 参数 (如果不想用户刷新页面时重复看到动画/toast)
        // router.replace('/payment-success'); // 可能不需要，因为 webhook 是最终确认

    }, []); // 只在首次加载时运行

    // 清理动画状态
    useEffect(() => {
        if (showConfettiEffect) {
            const timer = setTimeout(() => setShowConfettiEffect(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showConfettiEffect]);

    return (
        <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150, delay: 0.2 }}>
                <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl md:text-4xl font-bold mb-4 relative"
            >
                {t('paymentSuccessTitle') || "Payment Successful!"}
                <AnimatePresence>
                    {showConfettiEffect && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -right-10 -top-2"
                        >
                            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground mb-8 max-w-md"
            >
                {t('paymentSuccessDesc') || "Thank you for your purchase. Your account credits should reflect the update shortly after our system confirms the transaction."}
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                <Link href="/">
                    <Button size="lg">{t('backToHome') || "Back to Home"}</Button>
                </Link>
            </motion.div>
        </div>
    );
}