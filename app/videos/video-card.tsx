import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function VideoCard() {
    return (
        <>
            <Card className={cn("flex flex-col h-[400px]", "border-2", "shadow-lg", "transition-all duration-300 hover:shadow-xl", "rounded-lg")}>
                <CardHeader>
                    <CardTitle>
                        
                    </CardTitle>
                </CardHeader>
            </Card>

        </>
    )
}
