'use client';

import { useRef } from 'react';
import { useMonocleStore } from '@/lib/store';
import { CaptureModule } from './capture-module';

export function CaptureView() {
    const { setView } = useMonocleStore();
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
        const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);

        // Only trigger if it's a strongly vertical swipe and not a lateral scroll
        if (deltaX < 75) {
            // Swiped DOWN (pulling the view down to reveal queue above it)
            if (deltaY > 75) {
                setView('queue');
            }
        }
        touchStartRef.current = null;
    };

    return (
        <div
            className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-300 px-4 h-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <CaptureModule isModal={false} />
        </div>
    );
}
