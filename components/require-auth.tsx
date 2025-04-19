import { useSession } from "@/lib/utils";
import { ReactNode } from "react";
import { useClerk } from "@clerk/clerk-react";
import React from "react";

interface RequireAuthProps {
    children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
    const { isLoading, isAuthenticated } = useSession();
    const { openSignIn } = useClerk();

    // 处理加载状态 (保持不变)
    if (isLoading) {
        const child = React.Children.only(children as React.ReactElement);
        // 优化: 如果子组件是 Button，可以直接设置 disabled
        const props = {
            disabled: true,
            'aria-disabled': true,
            className: `${child.props.className || ''} opacity-50 cursor-not-allowed`.trim(),
            // 防止点击事件冒泡
            onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        return React.cloneElement(child, props);
    }

    if (isAuthenticated) {
        return <>{children}</>;
    }

    const handleAction = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openSignIn({});
    };

    // 克隆子元素并添加点击事件处理
    const child = React.Children.only(children as React.ReactElement);
    const childWithHandler = React.cloneElement(child, {
        onClick: handleAction,
        className: `${child.props.className || ''} cursor-pointer`.trim()
    });

    return <>{childWithHandler}</>;
} 