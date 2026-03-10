'use client';

import { useEffect } from 'react';
import { useMonocleStore } from '@/lib/store';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function HotkeyListener() {
    const { completeTask, holdTask, skipTask, randomTask } = useMonocleStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement ||
                (document.activeElement as HTMLElement).isContentEditable
            ) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'c': {
                    const result = completeTask();
                    if (result?.nextTask) {
                        toast.success("Recurring task completed!", {
                            description: `Next instance scheduled for ${format(result.nextTask.launchDate || Date.now(), 'MMM d')}`
                        });
                    } else {
                        toast.success("Task completed!");
                    }
                    break;
                }
                case 'h':
                    holdTask();
                    break;
                case 's':
                    skipTask();
                    break;
                case 'r':
                    randomTask();
                    break;
                // Case 'p' for Priority? 
                // "Priority button: jumps to the highest-priority task". 
                // We haven't implemented a specific "Priority Jump" action in the store yet, 
                // effectively we have `promoteTask` but that was for drafts.
                // The user asked for "Priority" action earlier which reorders queue.
                // Let's check store for `priorityTask` or equivalent.
                // Update: We implemented `promoteTask` but maybe we need a `prioritizeTask`?
                // Let's look at `FocusView`... it doesn't have a "Priority" button in the big list.
                // Ah, the "Priority" action was requested in Sprint 1...
                // Let's check `task.md`.
                // "Implement 'Priority' Action".
                // Let's check `store.ts` again.   
            }

            // Toggle Queue? 'q'
            if (e.key.toLowerCase() === 'q') {
                // We need a way to toggle the sheet. 
                // The Sheet is controlled by `QueueView`. 
                // We might need to move the sheet open state to global store or use a ref.
                // For MVP, maybe skip 'Q' if it's hard, OR add `isQueueOpen` to store.
                const queueTrigger = document.querySelector('[data-state="closed"] > svg.lucide-list')?.parentElement;
                // Hacky but might work if we can't control state easily.
                // Better: Add `isQueueOpen` to store.
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [completeTask, holdTask, skipTask, randomTask]);

    return null;
}
