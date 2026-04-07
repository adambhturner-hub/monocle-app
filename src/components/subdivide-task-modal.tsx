'use client';

import { useState, useEffect, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Split, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/sound-engine';

export function SubdivideTaskModal({ 
    task, 
    open, 
    onOpenChange 
}: { 
    task: Task | null, 
    open: boolean, 
    onOpenChange: (open: boolean) => void 
}) {
    const { addTask, archiveTask } = useMonocleStore();
    const [subtasks, setSubtasks] = useState<string[]>(['', '', '']);

    // Reset when opened
    useEffect(() => {
        if (open) {
            setSubtasks(['', '', '']);
        }
    }, [open]);

    if (!task || !open) return null;

    const handleUpdateSubtask = (index: number, val: string) => {
        const newArr = [...subtasks];
        newArr[index] = val;
        setSubtasks(newArr);
    };

    const handleAddLine = () => {
        setSubtasks([...subtasks, '']);
    };

    const handleRemoveLine = (index: number) => {
        const newArr = subtasks.filter((_, i) => i !== index);
        setSubtasks(newArr);
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (index === subtasks.length - 1) {
                handleAddLine();
            } else {
                // Focus next input... wait, let React rendering dictate it or just keep simple.
                // Simple: doing nothing on enter except preventing default if not last line
            }
        }
    };

    const handleSubmit = () => {
        const validTitles = subtasks.map(t => t.trim()).filter(Boolean);
        if (validTitles.length === 0) {
            toast.error("Please enter at least one subtask title.");
            return;
        }

        // Archive the parent task
        archiveTask(task.id);

        // Create the children
        validTitles.forEach((title, index) => {
            addTask({
                id: crypto.randomUUID(),
                title,
                status: 'todo',
                priority: task.priority,
                projectId: task.projectId,
                launchDate: task.launchDate,
                createdAt: Date.now() + index, // Add slight index to maintain order
                isDraft: false
            });
        });

        soundEngine.playComplete();
        toast.success(`Task split into ${validTitles.length} pieces.`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Split className="w-5 h-5 text-emerald-500" />
                        Subdivide Task
                    </DialogTitle>
                    <DialogDescription>
                        Break this heavy task into smaller, actionable pieces. The original task will be archived.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="p-3 bg-muted rounded-md mb-2">
                        <p className="text-sm font-medium opacity-70 line-through truncate">{task.title}</p>
                    </div>

                    <div className="space-y-2">
                        {subtasks.map((st, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <span className="text-xs font-semibold text-muted-foreground w-4">{i+1}.</span>
                                <Input 
                                    value={st}
                                    onChange={(e) => handleUpdateSubtask(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, i)}
                                    placeholder="Actionable step..."
                                    className="flex-1"
                                    autoFocus={i === 0}
                                />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleRemoveLine(i)}
                                    disabled={subtasks.length <= 1}
                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleAddLine} className="w-full text-xs text-muted-foreground">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Step
                    </Button>
                </div>

                <DialogFooter className="flex w-full sm:justify-between items-center">
                    <Button onClick={() => onOpenChange(false)} variant="ghost" className="text-muted-foreground">Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        Shatter Task <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
