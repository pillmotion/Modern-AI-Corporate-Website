"use client"

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Spinner } from "@/components/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, Youtube } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TwitterIcon } from "lucide-react";

function PendingVideo({ progress }: {
    progress: { done: number, total: number };
}) {
    return (
        <div className="w-full max-w-md rounded">
            <div className="flex items-center justify-center gap-4 h-48 flex-col px-4">
                <Spinner /> Video is {" "}
                {progress.done === progress.total && progress.done > 0 ? "finalizing" : "processing segments"}
                {progress && (
                    <Progress value={Math.round((progress.done / progress.total) * 100)} />
                )}
            </div>
        </div>
    )
}

/* export default function VideoContent() {
    const { videoId } = useParams<{ videoId: Id<"videos"> }>();
    const video = useQuery(api.videos.getVideo, { videoId });
    const title = useQuery(api.videos.getVideoTitle, video ? { videoId } : "skip");
    const [showConnectYoutubeDialog, setShowConnectYoutubeDialog] = useState(false);
    const channelInfo = useQuery(api.users.getSelectedChannel);
    const flags = useAction(api.flags.getFlags);
    const [isPostingToYoutube, setIsPostingToYoutube] = useState(false);
    const scheduleVideoAction = useAction(api.youtube.scheduleVideoAction);
    const { toast } = useToast();

    const handlePostToYoutube = async () => {
        if (!channelInfo) {
            setShowConnectYoutubeDialog(true);
            return;
        }

        setIsPostingToYoutube(true);
        try {
            await scheduleVideoAction({ videoId });
            toast({
                title: "Success",
                description: "Video scheduled for Youtube.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "An error occurred while scheduling the video.",
                variant: "destructive",
            });
        } finally {
            setIsPostingToYoutube(false);
        }
    };

    if (!video || !title) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spinner className="w-8 h-8" />
                <span className="ml-2">Loading...</span>
            </div>
        );
    }

    const downloadUrl = video.videoDownloadUrl || video.videoUrl;

    return (
        <div className="min-h-screen bg-primary text-white p-4 space-y-8 py-32">
            <div className="container mx-auto flex-grow max-w-4xl space-y-8 relative z-10">

                <Card>
                    <CardContent className="p-4">
                        <h1 className="text-2xl font-bold mb-4">{title}</h1>
                        <div className="w-full max-w-3xl mx-auto rounded flex justify-center items-center">
                            {video.status === "pending" ? (
                                <PendingVideo progress={video.progress} />
                            ) : video.status === "done" && video.videoUrl ? (
                                <video className="w-full h-[335px]" src={video.videoUrl} controls />
                            ) : (
                                <div className="flex items-center justify-center h-[335px] text-red-500">
                                    Error: Video processing failed or URL is missing
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-center space-x-4">
                            <TwitterShareButton url={`${window.location.origin}/videos/${videoId}`} title={`Check out this amazing AI-generated video: ${title}`}
                            >
                                <Button variant="secondary" className="flex items-center space-x-2">
                                    <TwitterIcon size={24} rounded />
                                    <span>Share on Twitter</span>
                                </Button>
                            </TwitterShareButton>

                            {flags?.publishToYoutube && (
                                <Button variant="secondary" className="flex items-center space-x-2" onClick={handlePostToYoutube}>
                                    <Youtube className="mr-2 w-4 h-4" /> Post on Youtube
                                </Button>
                            )}

                            {downloadUrl && video.status === "done" && (
                                <Button variant="secondary" className="flex items-center space-x-2" asChild>
                                    <DownloadIcon className="mr-2 w-4 h-4" /> Download Video
                                </Button>
                            )}
                        </div>
                    </CardContent>

                </Card>
            </div>
        </div>
    )
} */


















