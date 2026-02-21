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
        tickSession,
        tasks
    } = useMonocleStore();

    const task = tasks.find(t => t.id === taskId);

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
    const isSessionActive = currentSession?.taskId === taskId;
    const isRunning = isSessionActive && currentSession?.status === 'running';
    const isPaused = isSessionActive && currentSession?.status === 'paused';

    // Duration Logic
    // If no session, show defaults.
    // If session, show remaining.

    const [selectedDuration, setSelectedDuration] = useState(25);
    const PRESETS = [2, 5, 25, 45, 60, 90];

    const [hasManuallyStopped, setHasManuallyStopped] = useState(false);

    // Auto-start Lightning Tasks
    useEffect(() => {
        if (task?.isLightning && !isSessionActive && !currentSession && !hasManuallyStopped) {
            startSession(taskId, 2);
        }
    }, [task?.isLightning, isSessionActive, currentSession, taskId, startSession, hasManuallyStopped]);

    // Productivity Models map
    const getPresetBrand = (min: number) => {
        switch (min) {
            case 2: return "⚡️ Lightning";
            case 5: return "🏃 Micro-Sprint";
            case 25: return "🍅 Pomodoro";
            case 45: return "🌊 Flow State";
            case 60: return "🧠 Deep Work";
            case 90: return "🔋 Ultradian";
            default: return "Focus Timer";
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Popover State
    const [open, setOpen] = useState(false);

    // Alarm State (Must be before early return)
    const [hasRung, setHasRung] = useState(false);

    // Derived Active Session Values (Safe to compute before early return)
    const totalSeconds = isSessionActive && currentSession ? currentSession.durationScheduled * 60 : 0;
    const elapsed = isSessionActive && currentSession ? currentSession.durationElapsed : 0;
    const remaining = isSessionActive ? Math.max(0, totalSeconds - elapsed) : 0;
    const progress = totalSeconds > 0 ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
    const isFinished = isSessionActive && totalSeconds > 0 && remaining === 0;

    // Alarm Logic
    useEffect(() => {
        if (isFinished && !hasRung && isRunning) {
            soundEngine.playAlarm();
            setHasRung(true);
            pauseSession();
        } else if (!isFinished && hasRung) {
            setHasRung(false);
        }
    }, [isFinished, hasRung, isRunning, pauseSession]);

    if (!isSessionActive || !currentSession) {
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
                            <h4 className="font-medium flex items-center gap-2">
                                {getPresetBrand(selectedDuration)}
                            </h4>
                            <span className="text-xs text-muted-foreground">{selectedDuration}m</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
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
                                    {getPresetBrand(min)}
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
                        onClick={() => {
                            setHasManuallyStopped(true);
                            stopSession('abandoned');
                        }}
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
