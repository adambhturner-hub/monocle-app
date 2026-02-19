'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMonocleStore } from '@/lib/store';
import { Check, FastForward, PauseCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SessionCompletionDialogProps {
    open: boolean;
    taskId: string;
}

export function SessionCompletionDialog({ open, taskId }: SessionCompletionDialogProps) {
    const { stopSession, completeTask, skipTask, archiveTask, holdTask } = useMonocleStore();

    // Helper to wrap action with session stop
    const handleOutcome = (action: () => void, outcome: any) => {
        stopSession(outcome);
        action();
        // toast handles in actions usually
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && stopSession('abandoned') /* Closing dialog == abandon/done */}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">Session Complete!</DialogTitle>
                    <DialogDescription className="text-center">
                        Great focus. How would you like to proceed with this task?
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-4">
                    <Button
                        size="lg"
                        className="w-full gap-2 relative overflow-hidden group"
                        onClick={() => handleOutcome(completeTask, 'complete_task')}
                    >
                        <span className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Check className="h-4 w-4" />
                        Complete Task
                    </Button>

                    <Button
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={() => handleOutcome(holdTask, 'hold_task')}
                    >
                        <PauseCircle className="h-4 w-4" />
                        Hold for Later
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full gap-2 text-muted-foreground"
                        onClick={() => handleOutcome(skipTask, 'skip_task')}
                    >
                        <FastForward className="h-4 w-4" />
                        Skip Task
                    </Button>

                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => stopSession('keep_working')}
                    >
                        <Clock className="h-4 w-4" />
                        Keep Working (5m Break + Restart)
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
