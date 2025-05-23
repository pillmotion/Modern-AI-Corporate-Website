import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslation } from "@/hooks/useTranslation";

export function BuyCreditsButton({ credits }: { credits: number }) {
    const { t } = useTranslation();
    const pay = useAction(api.stripe.pay);
    const router = useRouter();

    async function handleUpgradeClick() {
        const url = await pay({ credits });
        router.push(url);
    }

    return (
        <Button variant={"secondary"} onClick={handleUpgradeClick}>
            {t('buyNow')}
        </Button>
    );
}
