"use client";

import { AuthWrapper } from "@/components/auth-wrapper";
import { VideoList } from "./video-list";

export default function Videos() {
    return (
        <div>
            <AuthWrapper
                loadingMessage="Loading videos..."
                unauthenticatedMessage="Please login to view your videos."
            >
                <div>
                    <h1>视频</h1>
                    {/* 在这里放置视频列表或其他需要认证的内容 */}
                    <VideoList />
                </div>
            </AuthWrapper>
        </div>
    );
}