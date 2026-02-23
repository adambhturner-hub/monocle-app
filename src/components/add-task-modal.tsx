'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Task } from '@/types';
import { CaptureModule } from './capture-module';

export interface AddTaskModalProps {
    taskToEdit?: Task;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddTaskModal({ taskToEdit, open: controlledOpen, onOpenChange }: AddTaskModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange! : setInternalOpen;

    const isEditMode = !!taskToEdit;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="w-full sm:max-w-[700px] h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden bg-transparent border-none shadow-none flex flex-col justify-center items-center [&>button]:hidden">

                {/* Visual Close Header inside the modal structure to override the generic Radix close button */}
                <div className="w-full max-w-2xl px-4 py-4 flex justify-end z-50 pointer-events-none">
                    <button
                        onClick={() => setOpen(false)}
                        className="pointer-events-auto h-10 w-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="w-full max-w-2xl shadow-2xl rounded-[2rem] overflow-hidden bg-card/95 backdrop-blur-xl ring-1 ring-white/10 relative">
                    {/* Fake Header for context */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-center pointer-events-none z-20">
                        <span className="text-sm font-semibold tracking-wider text-muted-foreground/50 uppercase">
                            {isEditMode ? 'Edit Task' : 'Quick Capture'}
                        </span>
                    </div>

                    {/* Mount the centralized Capture UI */}
                    <CaptureModule
                        taskToEdit={taskToEdit}
                        isModal={true}
                        onComplete={() => setOpen(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
