'use client';

import { useEffect, useState, useRef } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Timer, Volume2, VolumeX } from 'lucide-react';
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
        tasks
    } = useMonocleStore();

    const task = tasks.find(t => t.id === taskId);
    const [hasManuallyStopped, setHasManuallyStopped] = useState(false);

    // Derived session state
    const isSessionActive = currentSession?.taskId === taskId;
    const isRunning = isSessionActive && currentSession?.status === 'running';
    const isPaused = isSessionActive && currentSession?.status === 'paused';

    const totalSeconds = isSessionActive && currentSession ? currentSession.durationScheduled * 60 : 0;
    const PRESETS = [2, 5, 25, 45, 60, 90];
    const [selectedDuration, setSelectedDuration] = useState(25);
    const [open, setOpen] = useState(false);

    // Audio & Mute State
    const [isTickingMuted, setIsTickingMuted] = useState(false);

    // Local High-Performance Animation State
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const requestRef = useRef<number>(0);

    const calcElapsed = () => {
        if (!currentSession) return 0;
        const now = currentSession.status === 'paused' && currentSession.lastPausedAt ? currentSession.lastPausedAt : Date.now();
        const rawMs = now - currentSession.startTime;
        const actualMs = Math.max(0, rawMs - (currentSession.totalPausedMs || 0));
        return Math.floor(actualMs / 1000);
    };

    const updateTimer = () => {
        if (currentSession) {
            setElapsedSeconds(calcElapsed());
            requestRef.current = requestAnimationFrame(updateTimer);
        }
    };

    useEffect(() => {
        if (currentSession) {
            requestRef.current = requestAnimationFrame(updateTimer);
        } else {
            setElapsedSeconds(0);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [currentSession?.startTime, currentSession?.status, currentSession?.totalPausedMs, currentSession?.id]);

    // Watch Tick Sound Loop
    useEffect(() => {
        let tickInterval: NodeJS.Timeout;
        if (isRunning && !isTickingMuted) {
            tickInterval = setInterval(() => {
                soundEngine.playTick();
            }, 1000);
        }
        return () => clearInterval(tickInterval);
    }, [isRunning, isTickingMuted]);

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
            case 5: return "🏃 Quick Mode";
            case 25: return "🍅 Pomodoro";
            case 45: return "🌊 Flow State";
            case 60: return "🧠 Deep Work";
            case 90: return "🔋 Ultradian";
            default: return "Focus Timer";
        }
    };

    const getColorForDuration = (min: number) => {
        if (task?.isLightning && !task?.isFrog) return "text-yellow-500";
        if (task?.isFrog) return "text-emerald-500";
        switch (min) {
            case 2: return "text-yellow-500";
            case 5: return "text-blue-400";
            case 25: return "text-orange-500";
            case 45: return "text-indigo-500";
            case 60: return "text-purple-500";
            case 90: return "text-rose-500";
            default: return "text-primary";
        }
    };

    const remaining = isSessionActive ? Math.max(0, totalSeconds - elapsedSeconds) : 0;
    const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
    const isFinished = isSessionActive && totalSeconds > 0 && remaining === 0;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Alarm State 
    const [hasRung, setHasRung] = useState(false);

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
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground shadow-sm transition-transform hover:scale-105">
                        <Timer className="h-6 w-6" />
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
                                        "flex-1 transition-all border",
                                        selectedDuration === min ? "font-bold shadow-md" : "text-muted-foreground hover:bg-muted"
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

    const circleRadius = 120;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circumference - (progress * circumference);
    const colorClass = getColorForDuration(currentSession.durationScheduled);

    return (
        <div className="flex flex-col items-center gap-6 py-4 w-full animate-in fade-in zoom-in duration-300">
            {/* Circular SVG Timer */}
            <div className="relative flex items-center justify-center w-[280px] h-[280px] group">
                <svg
                    className={cn("w-full h-full -rotate-90 transition-all duration-300", isRunning ? "" : "opacity-50")}
                    viewBox="0 0 280 280"
                >
                    {/* Background Track */}
                    <circle
                        cx="140"
                        cy="140"
                        r={circleRadius}
                        className="stroke-muted/30 fill-none"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress Track */}
                    <circle
                        cx="140"
                        cy="140"
                        r={circleRadius}
                        className={cn("fill-none transition-all duration-100 ease-linear", colorClass)}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Internal HUD */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className={cn("text-6xl font-mono font-medium tracking-tighter tabular-nums drop-shadow-md", colorClass, isRunning ? "animate-pulse" : "")}>
                        {formatTime(remaining)}
                    </div>
                    {!isRunning && !isFinished && (
                        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground/50">Paused</span>
                    )}
                    {isFinished && (
                        <span className="text-xs uppercase tracking-widest font-bold text-destructive animate-pulse">Session Complete</span>
                    )}
                    {(isRunning || isPaused) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 rounded-full mt-2 transition-opacity", isRunning && !isTickingMuted ? "opacity-100" : "opacity-30")}
                            onClick={(e) => { e.stopPropagation(); setIsTickingMuted(!isTickingMuted); }}
                            title={isTickingMuted ? "Unmute Timer Ticking" : "Mute Timer Ticking"}
                        >
                            {isTickingMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                    )}
                </div>

                {/* Pulse Glow Effect behind the timer */}
                {isRunning && (
                    <div className={cn("absolute inset-2 rounded-full -z-10 blur-3xl opacity-20 animate-pulse bg-current", colorClass)} />
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                {isRunning ? (
                    <Button variant="outline" size="icon" className="h-14 w-14 rounded-full border-2 hover:bg-muted/50" onClick={pauseSession} title="Pause">
                        <Pause className="h-6 w-6" />
                    </Button>
                ) : (
                    <Button variant="default" size="icon" className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform" onClick={resumeSession} title="Resume">
                        <Play className="h-6 w-6 fill-current" />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                        setHasManuallyStopped(true);
                        stopSession('abandoned');
                    }}
                    title="End Session"
                >
                    <Square className="h-4 w-4 fill-current" />
                </Button>
            </div>

            <SessionCompletionDialog
                open={isFinished && isSessionActive}
                taskId={taskId}
            />
        </div>
    );
}
