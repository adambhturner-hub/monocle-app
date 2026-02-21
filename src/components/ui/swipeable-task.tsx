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
    downAction?: (taskId: string) => void;
    downThresholdAction?: (taskId: string, minutes: number, label: string) => void;
    downIcon?: React.ElementType;
    downLabel?: string;
    downColorClass?: string;
    downBgClass?: string;
    upAction?: (taskId: string) => void;
    upIcon?: React.ElementType;
    upLabel?: string;
    upColorClass?: string;
    upBgClass?: string;
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
    downAction,
    downThresholdAction,
    downIcon: DownIcon = Shuffle,
    downLabel = "Down",
    downColorClass = "text-indigo-500",
    downBgClass = "bg-indigo-500",
    upAction,
    upIcon: UpIcon = Shuffle,
    upLabel = "Up",
    upColorClass = "text-indigo-500",
    upBgClass = "bg-indigo-500",
    isMobile
}: SwipeableTaskProps) {
    const [offset, setOffset] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
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
                if ((deltaY > 0 && (downAction || downThresholdAction)) || (deltaY < 0 && upAction)) {
                    isHorizontalSwipeRef.current = false;
                    e.preventDefault(); // lock vertical swipe
                } else {
                    isHorizontalSwipeRef.current = false;
                    setIsSwiping(false); // Cancel swipe logic
                    return;
                }
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
        } else if (isHorizontalSwipeRef.current === false && (downAction || downThresholdAction || upAction)) {
            // Vertical Drag
            const resistance = 0.8; // Allow more travel vertically
            let visualOffset = deltaY * resistance;

            // Constrain pull directions based on available actions
            if (visualOffset < 0 && !upAction) visualOffset = 0;
            if (visualOffset > 0 && !(downAction || downThresholdAction)) visualOffset = 0;

            // Cap visual travel for simple actions (not threshold)
            if (downAction && !downThresholdAction && visualOffset > MAX_SWIPE) {
                visualOffset = MAX_SWIPE;
            }
            if (upAction && visualOffset < -MAX_SWIPE) {
                visualOffset = -MAX_SWIPE;
            }

            setOffsetY(visualOffset);
        }
    };

    const handleTouchEnd = () => {
        if (!isMobile) return;

        if (isHorizontalSwipeRef.current) {
            if (offset > SWIPE_THRESHOLD) {
                leftAction(task.id);
            } else if (offset < -SWIPE_THRESHOLD && rightAction) {
                rightAction(task.id);
            }
        } else if (isHorizontalSwipeRef.current === false) {
            if (downThresholdAction) {
                // Vertical Drop Thresholds
                if (offsetY > 240) {
                    downThresholdAction(task.id, 24 * 60, "Tomorrow");
                } else if (offsetY > 180) {
                    downThresholdAction(task.id, 240, "4 hours");
                } else if (offsetY > 120) {
                    downThresholdAction(task.id, 60, "1 hour");
                } else if (offsetY > 60) {
                    downThresholdAction(task.id, 30, "30 mins");
                }
            } else if (downAction && offsetY > SWIPE_THRESHOLD) {
                downAction(task.id);
            } else if (upAction && offsetY < -SWIPE_THRESHOLD) {
                upAction(task.id);
            }
        }

        // Snap back
        setOffset(0);
        setOffsetY(0);
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

            {/* Vertical Hold Background */}
            {downThresholdAction && offsetY > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-start rounded-lg bg-indigo-500/10 text-indigo-500 font-bold tracking-wide pt-4 z-0">
                    <span className="text-sm">
                        {offsetY > 240 ? "Holding until Tomorrow" : offsetY > 180 ? "Holding for 4 hours" : offsetY > 120 ? "Holding for 1 hour" : offsetY > 60 ? "Holding for 30 mins" : "Pull to Hold..."}
                    </span>
                    <div className="w-1/2 h-1 bg-indigo-500/20 mt-4 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-100 ease-out"
                            style={{ width: `${Math.min(100, (offsetY / 240) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Basic Vertical Background */}
            {downAction && !downThresholdAction && offsetY > 0 && (
                <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-start rounded-lg font-bold tracking-wide pt-6 z-0",
                    offsetY > SWIPE_THRESHOLD ? cn(downBgClass, "text-white") : cn(downColorClass, downBgClass.replace('bg-', 'bg-opacity-20 bg-')),
                    offsetY > 5 ? "opacity-100 transition-opacity duration-200" : "opacity-0"
                )}>
                    <DownIcon className="h-5 w-5 mb-1" />
                    {offsetY > SWIPE_THRESHOLD && <span className="text-sm">{downLabel}</span>}
                </div>
            )}

            {/* Up Action Background */}
            {upAction && offsetY < 0 && (
                <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-end rounded-lg font-bold tracking-wide pb-6 z-0",
                    offsetY < -SWIPE_THRESHOLD ? cn(upBgClass, "text-white") : cn(upColorClass, upBgClass.replace('bg-', 'bg-opacity-20 bg-')),
                    offsetY < -5 ? "opacity-100 transition-opacity duration-200" : "opacity-0"
                )}>
                    {offsetY < -SWIPE_THRESHOLD && <span className="text-sm">{upLabel}</span>}
                    <UpIcon className="h-5 w-5 mt-1" />
                </div>
            )}

            {/* Foreground Content */}
            <div
                className={cn(
                    "relative z-10 w-full rounded-lg",
                    !isSwiping ? "transition-transform duration-300 ease-out" : "" // Animate snap-back only
                )}
                style={{ transform: `translate(${offset}px, ${offsetY}px)` }}
            >
                {children}
            </div>
        </div>
    );
}
