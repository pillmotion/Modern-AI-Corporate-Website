"use client";

import React, { ReactNode } from "react";
import { useSession } from "@/lib/utils";
import { Spinner } from "@/components/spinner";

interface AuthWrapperProps {
    children: ReactNode;
    loadingMessage?: string | ReactNode;
    unauthenticatedMessage?: string | ReactNode;
}

export function AuthWrapper({
    children,
    loadingMessage = "Loading...",
    unauthenticatedMessage = "Please log in to view this content.",
}: AuthWrapperProps) {
    const { isLoading, isAuthenticated } = useSession();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4 min-h-[100px]">
                {typeof loadingMessage === 'string' ? (
                    <>
                        <Spinner className="w-5 h-5 mr-2" />
                        <span>{loadingMessage}</span>
                    </>
                ) : (
                    loadingMessage
                )}
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center p-4 min-h-[100px]">
                {typeof unauthenticatedMessage === 'string' ? (
                    <span>{unauthenticatedMessage}</span>
                ) : (
                    unauthenticatedMessage
                )}
                {/* 你也可以在这里选择性地添加一个登录按钮 */}
            </div>
        );
    }

    return <>{children}</>;
}