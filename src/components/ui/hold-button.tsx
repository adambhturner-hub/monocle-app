import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onComplete: () => void;
    holdTime?: number; // Time in milliseconds required to hold
    label?: string;
}

export function HoldButton({
    onComplete,
    holdTime = 1500,
    label = 'Hold to Win',
    className,
    ...props
}: HoldButtonProps) {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const startHold = () => {
        setIsHolding(true);
        setProgress(0);
        startTimeRef.current = performance.now();

        const updateProgress = (currentTime: number) => {
            if (!startTimeRef.current) return;
            const elapsed = currentTime - startTimeRef.current;
            const newProgress = Math.min((elapsed / holdTime) * 100, 100);
            setProgress(newProgress);

            if (newProgress < 100) {
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            } else {
                setIsHolding(false);
                setProgress(0);
                startTimeRef.current = null;
                onComplete();
            }
        };

        animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    const handleContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
    };

    const endHold = () => {
        setIsHolding(false);
        setProgress(0);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        startTimeRef.current = null;
    };

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <div className={cn("relative inline-flex items-center justify-center p-3", className)}>
            {/* Background SVG Circle */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/30"
                />
                {/* Progress SVG Circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className={cn(
                        "text-green-500 transition-all duration-75",
                        progress > 0 ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                        strokeDasharray: 301.59, // 2 * Math.PI * 48
                        strokeDashoffset: 301.59 - (progress / 100) * 301.59,
                    }}
                />
            </svg>

            <Button
                onMouseDown={startHold}
                onMouseUp={endHold}
                onMouseLeave={endHold}
                onTouchStart={startHold}
                onTouchEnd={endHold}
                onTouchCancel={endHold}
                onContextMenu={handleContextMenu}
                className={cn(
                    "w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-200 select-none",
                    isHolding ? "scale-95 shadow-inner bg-secondary" : "hover:scale-105 shadow-md",
                )}
                style={{ touchAction: 'none' }}
                variant="outline"
                {...props}
            >
                <span className="text-4xl">🐸</span>
                <span className="font-semibold text-sm opacity-80">{label}</span>
            </Button>
        </div>
    );
}
