'use client';

import { useEffect, useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, RotateCcw, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionCompletionDialog } from './session-completion-dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { soundEngine } from '@/lib/sound-engine';

export function FocusTimer({ taskId }: { taskId: string }) {
    const {
        currentSession,
        startSession,
        pauseSession,
        resumeSession,
        stopSession,
        tickSession
    } = useMonocleStore();

    // Local state for the ticker interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (currentSession?.status === 'running') {
            interval = setInterval(() => {
                tickSession();
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [currentSession?.status, tickSession]);

    // Derived state
    const isSessionActive = currentSession && currentSession.taskId === taskId;
    const isRunning = isSessionActive && currentSession.status === 'running';
    const isPaused = isSessionActive && currentSession.status === 'paused';

    // Duration Logic
    // If no session, show defaults.
    // If session, show remaining.

    const [selectedDuration, setSelectedDuration] = useState(25);
    const PRESETS = [25, 45, 60];

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Popover State
    const [open, setOpen] = useState(false);

    if (!isSessionActive) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground">
                        <Timer className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="center">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium leading-none">Focus Timer</h4>
                            <span className="text-xs text-muted-foreground">{selectedDuration}m</span>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                            {PRESETS.map(min => (
                                <Button
                                    key={min}
                                    variant={selectedDuration === min ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedDuration(min)}
                                    className={cn(
                                        "flex-1 transition-all",
                                        selectedDuration === min ? "font-bold" : "text-muted-foreground"
                                    )}
                                >
                                    {min}m
                                </Button>
                            ))}
                        </div>
                        <Button
                            size="default"
                            className="w-full gap-2 font-semibold tracking-wide rounded-md shadow-sm"
                            onClick={async () => {
                                // Mobile Audio Unlock: Must be direct user interaction
                                await soundEngine.unlock();
                                startSession(taskId, selectedDuration);
                                setOpen(false);
                            }}
                        >
                            <Play className="h-4 w-4 fill-current" />
                            Start Focus
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // Active Session View
    const totalSeconds = currentSession.durationScheduled * 60;
    const elapsed = currentSession.durationElapsed;
    const remaining = Math.max(0, totalSeconds - elapsed);
    const progress = Math.min(100, (elapsed / totalSeconds) * 100);
    const isFinished = remaining === 0;

    return (
        <div className="flex flex-col items-center gap-4 py-2 w-full animate-in fade-in zoom-in duration-300">
            {/* Minimal Progress Bar */}
            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-center justify-between w-full px-2">
                <div className="text-4xl font-mono font-medium tracking-tighter tabular-nums">
                    {formatTime(remaining)}
                </div>

                <div className="flex items-center gap-2">
                    {isRunning ? (
                        <Button variant="outline" size="icon" onClick={pauseSession} title="Pause">
                            <Pause className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button variant="outline" size="icon" onClick={resumeSession} title="Resume">
                            <Play className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => stopSession('abandoned')}
                        title="End Session"
                    >
                        <Square className="h-4 w-4 fill-current" />
                    </Button>
                </div>
            </div>

            {/* Completion Dialog Trigger (Auto-open if finished?) */}
            <SessionCompletionDialog
                open={isFinished && isSessionActive}
                taskId={taskId}
            />
        </div>
    );
}
