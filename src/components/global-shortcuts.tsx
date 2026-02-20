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
        completeTask,
        randomTask
    } = useMonocleStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input/textarea is focused or contentEditable
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) {
                return;
            }

            // Command/Ctrl + E: Complete Task
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                const result = completeTask();
                if (result?.nextTask) {
                    toast.success("Recurring task completed!", {
                        description: `Next instance scheduled for ${format(result.nextTask.dueDate || Date.now(), 'MMM d')}`
                    });
                } else {
                    toast.success("Task completed!");
                }
            }

            // Command/Ctrl + 1: Focus Mode
            if ((e.metaKey || e.ctrlKey) && e.key === '1') {
                e.preventDefault();
                setView('focus');
                setOpenSheet(null);
            }

            // Command/Ctrl + 2: Queue Mode
            if ((e.metaKey || e.ctrlKey) && e.key === '2') {
                e.preventDefault();
                setView('queue');
                setOpenSheet(null);
            }

            // F: Focus Mode
            if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                setView('focus');
                setOpenSheet(null);
            }

            // Q: Queue Mode
            if (e.key.toLowerCase() === 'q' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                setView('queue');
                setOpenSheet(null);
            }

            // Command/Ctrl + 3: Archive Mode (Sheet)
            if ((e.metaKey || e.ctrlKey) && e.key === '3') {
                e.preventDefault();
                setOpenSheet('archive');
            }

            // Command/Ctrl + K: Add Task
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setActiveModal('add-task');
            }

            // S: Shuffle
            if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                randomTask();
                toast.success("Shuffled!");
            }

            // Focus Session Shortcuts
            // T: Start/Pause
            if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                const { currentSession, startSession, pauseSession, resumeSession, getVisibleTasks } = useMonocleStore.getState();

                if (currentSession?.status === 'running') {
                    pauseSession();
                    toast.success("Focus Paused");
                } else if (currentSession?.status === 'paused') {
                    resumeSession();
                    toast.success("Focus Resumed");
                } else if (!currentSession) {
                    // Start new session for active task
                    const visible = getVisibleTasks();
                    if (visible.length > 0) {
                        startSession(visible[0].id, 25); // Default 25m
                        toast.success("Focus Started (25m)");
                    }
                }
            }

            // Shift+T: Stop Session
            if (e.key.toLowerCase() === 't' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const { currentSession, stopSession } = useMonocleStore.getState();
                if (currentSession) {
                    stopSession('abandoned'); // Or asking/confirming? For now just stop.
                    toast("Session Ended");
                }
            }

            // Alt+T: Cycle Presets (Optional - maybe skip for now if complex to wire to UI state)

            // Enter: Open Add Task Modal (Legacy/Alternative)
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!activeModal) {
                    setActiveModal('add-task');
                }
            }

            // Esc: Close everything
            if (e.key === 'Escape') {
                // Optional: Close sheets if open
                // setOpenSheet(null);
            }

            // ?: Open Shortcuts Help (Settings)
            if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                setOpenSheet('settings');
                toast.dismiss(); // Clear current toasts to show we did something?
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal, setActiveModal, setOpenSheet, setView, completeTask, randomTask]);

    return null;
}
