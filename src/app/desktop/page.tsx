'use client';

import { useEffect, useCallback } from 'react';
import { CaptureModule } from '@/components/capture-module';

export default function DesktopCapturePage() {

    const hideWindow = useCallback(async () => {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('hide_window');
            } catch (e) {
                console.error('Failed to hide Tauri window', e);
            }
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                hideWindow();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // When the window is focused, we should ideally auto-focus the input, 
        // but CaptureModule already has autoFocus logic on mount.

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hideWindow]);

    return (
        <div className="w-full max-w-xl mx-auto shadow-2xl rounded-2xl overflow-hidden ring-1 ring-border bg-card animate-in fade-in zoom-in-95 duration-200">
            {/* 
              We wrap it in a custom container to ensure it looks like a floating Spotlight bar. 
              The layout.tsx applies the top padding and transparency.
            */}
            <CaptureModule onComplete={hideWindow} />
            <div className="absolute top-2 right-4 text-[10px] text-muted-foreground font-medium pointer-events-none opacity-50">
                ESC to hide
            </div>
        </div>
    );
}
