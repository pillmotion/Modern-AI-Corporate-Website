'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Code, Newspaper, Mic2, Navigation, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { TranslationKey } from '@/lib/translations';
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

const payAsYouGo = [
  {
    type: "thousandCredits" as TranslationKey,
    price: "$6",
    popular: false
  },
  {
    type: "tenThousandCredits" as TranslationKey,
    price: "$55",
    popular: true
  },
  {
    type: "thirtyThousandCredits" as TranslationKey,
    price: "$150",
    popular: false
  }
];

export default function Home() {
  const { t } = useTranslation();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { toast } = useToast();
  // Get the Convex action
  const createCheckout = useAction(api.stripe.createCheckoutSession); // <-- Use the correct action name

  const handlePlanClick = async (type: string) => {
    // Button rendering logic already ensures user is loaded and signed in

    try {
      toast({ title: t('creatingPaymentLink') });

      // Call the Convex action to get the Stripe Checkout URL
      const sessionUrl = await createCheckout({ planType: type });

      if (!sessionUrl) {
        throw new Error(t('getPaymentLinkFailed'));
      }

      // Redirect the user to the Stripe Checkout page
      window.location.href = sessionUrl; // <-- Navigate directly

    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : t('unknownError');
      toast({
        title: t('error'),
        description: description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-primary/5 via-primary/10 to-background">
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary min-h-[96px] md:min-h-[120px] flex items-center justify-center">
                {t('heroTitle')}
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground mb-8"
            >
              {t('heroDescription')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex gap-4 justify-center"
            >
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <a href="/generate">{t('getStarted')}</a>
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
                <a href="#pricing">{t('learnMore')}</a>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Grid pattern with gradient overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.primary/10)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.primary/10)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>
      </section>

      {/* Services Section */}
      <section id="features" className="py-20">
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
      </section>

      {/* Products Section */}
      <section id="pricing" className="py-20">
        <div className="container">
          <div className="mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-primary">{t('payAsYouGo')}</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {payAsYouGo.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card key={plan.type} className={`p-6 relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary text-white px-3 py-1 rounded-full text-sm">
                          {t('bestValue')}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-lg" />
                    <div className="relative text-center">
                      <h3 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-primary/90">{t(plan.type)}</h3>
                      <div className="mb-6">
                        <span className="text-4xl font-bold bg-clip-text text-transparent bg-primary/90">{plan.price}</span>
                      </div>
                      {(isUserLoaded && isSignedIn) ? (
                        <Button
                          className="w-full bg-primary text-white"
                          variant={plan.popular ? "default" : "outline"}
                          onClick={() => handlePlanClick(plan.type)} // 直接调用 handlePlanClick
                        >
                          {t('buyNow')}
                        </Button>
                      ) : (
                        <SignInButton mode="modal">
                          <Button
                            className="w-full bg-primary text-white"
                            variant={plan.popular ? "default" : "outline"}
                          >
                            {t('loginToBuy')}
                          </Button>
                        </SignInButton>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}