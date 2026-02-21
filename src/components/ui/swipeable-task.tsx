import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useMonocleStore } from '@/lib/store';
import { Task } from '@/types';
import { CheckCircle2, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

import React from 'react';

interface SwipeableTaskProps {
    task: Task;
    children: ReactNode;
    leftAction: (taskId: string) => void;
    leftIcon?: React.ElementType;
    leftLabel?: string;
    leftColorClass?: string;
    leftBgClass?: string;
    rightAction?: (taskId: string) => void;
    rightIcon?: React.ElementType;
    rightLabel?: string;
    rightColorClass?: string;
    rightBgClass?: string;
    isMobile: boolean; // Only enable swipes on mobile layout
}

export function SwipeableTask({
    task,
    children,
    leftAction,
    leftIcon: LeftIcon = CheckCircle2,
    leftLabel = "Complete",
    leftColorClass = "text-emerald-500",
    leftBgClass = "bg-emerald-500",
    rightAction,
    rightIcon: RightIcon = Shuffle,
    rightLabel = "Skip",
    rightColorClass = "text-blue-500",
    rightBgClass = "bg-blue-500",
    isMobile
}: SwipeableTaskProps) {
    const [offset, setOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const isHorizontalSwipeRef = useRef<boolean | null>(null);

    const SWIPE_THRESHOLD = 80; // Pixels needed to trigger action
    const MAX_SWIPE = 120; // Visual cap

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        startXRef.current = e.touches[0].clientX;
        startYRef.current = e.touches[0].clientY;
        isHorizontalSwipeRef.current = null;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMobile || !isSwiping) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = currentX - startXRef.current;
        const deltaY = currentY - startYRef.current;

        // Determine scroll vs swipe intention on early movement
        if (isHorizontalSwipeRef.current === null) {
            if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
                // If sliding left (deltaX < 0) but NO rightAction is defined, lock horizontal swipe but don't set offset
                if (deltaX < 0 && !rightAction) return;

                isHorizontalSwipeRef.current = true;
                e.preventDefault(); // Stop vertical scrolling once locked as swipe
            } else if (Math.abs(deltaY) > 10) {
                isHorizontalSwipeRef.current = false;
                setIsSwiping(false); // Cancel swipe logic
                return;
            } else {
                return; // Wait for clearer intention
            }
        }

        if (isHorizontalSwipeRef.current) {
            // Apply slight resistance
            const resistance = 0.6;
            let visualOffset = deltaX * resistance;

            // Cap the visual travel
            if (visualOffset > MAX_SWIPE) visualOffset = MAX_SWIPE;
            if (visualOffset < -MAX_SWIPE) visualOffset = -MAX_SWIPE;

            // Prevent sliding left if no rightAction
            if (visualOffset < 0 && !rightAction) visualOffset = 0;

            setOffset(visualOffset);
        }
    };

    const handleTouchEnd = () => {
        if (!isMobile) return;

        if (offset > SWIPE_THRESHOLD) {
            // Trigger Right Swipe (from left side)
            leftAction(task.id);
        } else if (offset < -SWIPE_THRESHOLD && rightAction) {
            // Trigger Left Swipe (from right side)
            rightAction(task.id);
        }

        // Snap back
        setOffset(0);
        setIsSwiping(false);
        isHorizontalSwipeRef.current = null;
    };

    return (
        <div
            className="relative w-full overflow-hidden rounded-lg"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Actions */}
            <div className="absolute inset-0 flex items-center justify-between px-6 rounded-lg font-bold text-sm tracking-wide">
                {/* Left Background (e.g. Complete or Promote) */}
                <div
                    className={cn(
                        "flex items-center gap-2 h-full absolute inset-y-0 left-0 px-6",
                        (!isSwiping || offset > SWIPE_THRESHOLD) ? "transition-all duration-200" : "",
                        offset > SWIPE_THRESHOLD
                            ? cn("text-white w-full rounded-lg justify-start", leftBgClass)
                            : cn("rounded-l-lg justify-start opacity-0", leftBgClass.replace('bg-', 'bg-opacity-20 bg-'), leftColorClass),
                        offset > 5 && "opacity-100" // fade in as we drag
                    )}
                    style={{ width: offset > SWIPE_THRESHOLD ? '100%' : `${Math.abs(offset)}px` }}
                >
                    <LeftIcon className="h-5 w-5 shrink-0" />
                    {offset > SWIPE_THRESHOLD && <span>{leftLabel}</span>}
                </div>

                {/* Right Background (e.g. Skip) */}
                {rightAction && (
                    <div
                        className={cn(
                            "flex items-center gap-2 h-full absolute inset-y-0 right-0 px-6",
                            (!isSwiping || offset < -SWIPE_THRESHOLD) ? "transition-all duration-200" : "",
                            offset < -SWIPE_THRESHOLD
                                ? cn("text-white w-full rounded-lg justify-end", rightBgClass)
                                : cn("rounded-r-lg justify-end opacity-0", rightBgClass.replace('bg-', 'bg-opacity-20 bg-'), rightColorClass),
                            offset < -5 && "opacity-100"
                        )}
                        style={{ width: offset < -SWIPE_THRESHOLD ? '100%' : `${Math.abs(offset)}px` }}
                    >
                        {offset < -SWIPE_THRESHOLD && <span>{rightLabel}</span>}
                        <RightIcon className="h-5 w-5 shrink-0" />
                    </div>
                )}
            </div>

            {/* Foreground Content */}
            <div
                className={cn(
                    "relative z-10 w-full rounded-lg",
                    !isSwiping ? "transition-transform duration-300 ease-out" : "" // Animate snap-back only
                )}
                style={{ transform: `translateX(${offset}px)` }}
            >
                {children}
            </div>
        </div>
    );
}
