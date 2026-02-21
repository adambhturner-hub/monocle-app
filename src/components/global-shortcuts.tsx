'use client';

import { useEffect } from 'react';
import { useMonocleStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function GlobalShortcuts() {
    const {
        activeModal,
        setActiveModal,
        setOpenSheet,
        setView,
        view,
        completeTask,
        skipTask,
        randomTask,
        getVisibleTasks
    } = useMonocleStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input/textarea is focused or contentEditable
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) {
                return;
            }

            // Modifier check
            const hasModifier = e.metaKey || e.ctrlKey || e.altKey;

            // F: Focus Mode
            if (e.key.toLowerCase() === 'f' && !hasModifier) {
                setView('focus');
                setOpenSheet(null);
            }

            // Q: Queue Mode
            if (e.key.toLowerCase() === 'q' && !hasModifier) {
                setView('queue');
                setOpenSheet(null);
            }

            // A: Analytics Mode
            if (e.key.toLowerCase() === 'a' && !hasModifier) {
                setView('analytics');
                setOpenSheet(null);
            }

            // I: Quick Add
            if (e.key.toLowerCase() === 'i' && !hasModifier) {
                e.preventDefault();
                setView('capture');
            }

            // C: Complete Task
            if (e.key.toLowerCase() === 'c' && !hasModifier) {
                e.preventDefault();
                const result = completeTask();
                if (result?.nextTask) {
                    toast.success("Recurring task completed!", {
                        description: `Next instance scheduled for ${format(result.nextTask.dueDate || Date.now(), 'MMM d')}`
                    });
                } else if (result) {
                    toast.success("Task completed!");
                }
            }

            // S: Skip Task
            if (e.key.toLowerCase() === 's' && !hasModifier) {
                e.preventDefault();
                skipTask();
                toast("Task passed");
            }

            // R: Random / Curveball
            if (e.key.toLowerCase() === 'r' && !hasModifier) {
                e.preventDefault();
                randomTask();
                setView('focus');
                toast("Curveball incoming...");
            }

            // Command/Ctrl + K: Add Task (Legacy mapping for power users)
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setView('capture');
            }

            // Focus Session Shortcuts
            // T: Start/Pause
            if (e.key.toLowerCase() === 't' && !hasModifier && !e.shiftKey) {
                const { currentSession, startSession, pauseSession, resumeSession } = useMonocleStore.getState();

                if (currentSession?.status === 'running') {
                    pauseSession();
                    toast.success("Focus Paused");
                } else if (currentSession?.status === 'paused') {
                    resumeSession();
                    toast.success("Focus Resumed");
                } else if (!currentSession) {
                    const visible = getVisibleTasks();
                    if (visible.length > 0) {
                        startSession(visible[0].id, 25);
                        toast.success("Focus Started (25m)");
                    }
                }
            }

            // Shift+T: Stop Session
            if (e.key.toLowerCase() === 't' && e.shiftKey && !hasModifier) {
                const { currentSession, stopSession } = useMonocleStore.getState();
                if (currentSession) {
                    stopSession('abandoned');
                    toast("Session Ended");
                }
            }

            // Enter: Open Capture mode fallback
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!activeModal && view !== 'capture') {
                    setView('capture');
                }
            }

            // ?: Open Settings
            if (e.key === '?' && !hasModifier) {
                setOpenSheet('settings');
                toast.dismiss();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal, setActiveModal, setOpenSheet, setView, completeTask, skipTask, randomTask]);

    return null;
}
