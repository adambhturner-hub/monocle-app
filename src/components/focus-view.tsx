'use client';

import * as React from 'react';
import { useMonocleStore } from '@/lib/store';
import { FocusTimer } from './focus-timer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Pause, CornerUpRight, Shuffle, AlertCircle, Clock, Calendar, Repeat, MoreHorizontal, Edit, Copy, FileText, Trash2, Archive, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns';
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar'; // Renamed to avoid collision
import { AddTaskModal } from './add-task-modal';
import TextareaAutosize from 'react-textarea-autosize';
import { RecurrenceInterval } from '@/types';
import { FocusAtmosphere } from './focus-atmosphere';

export function FocusView() {
    const {
        tasks,
        projects,
        activeProject,
        completeTask,
        holdTask,
        skipTask,
        randomTask,
        cyclePriority,
        undo,
        deleteTask,
        duplicateTask,
        toggleDraft,
        archiveTask,
        setOpenSheet,
        updateTask
    } = useMonocleStore();

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = React.useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    const activeTask = tasks.filter(t =>
        !t.isDraft &&
        t.status !== 'done' &&
        (activeProject ? t.projectId === activeProject : true)
    )[0];

    // Local state for immediate feedback while editing
    // We synchronize with activeTask on mount or change
    // Actually, controlled inputs with store update is fine if performance holds.
    // If typing lags, we need local state + onBlur.
    // Let's try direct store update first for simplicity, usually fine with small state.
    // Wait, heavy layout shift might occur? No.

    const project = activeTask?.projectId ? projects.find(p => p.id === activeTask.projectId) : null;

    if (!activeTask) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="p-8 rounded-full bg-secondary/30 mb-4">
                    <Check className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h2 className="text-3xl font-bold text-muted-foreground/80">No tasks remain</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    You've cleared your queue. Add a new task above or take a break.
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpenSheet('queue')}>Open Queue</Button>
                    <Button variant="outline" onClick={() => setOpenSheet('archive')}>View Archive</Button>
                </div>
            </div>
        );
    }

    // Handlers
    const handleDateSelect = (date: Date | undefined) => {
        updateTask(activeTask.id, { dueDate: date ? date.getTime() : undefined });
        setIsCalendarOpen(false);
    };

    const handlePrioritySelect = (value: string) => {
        updateTask(activeTask.id, { priority: value as 'low' | 'medium' | 'high' });
    };

    const handleRecurrenceSelect = (value: string) => {
        const recurrence = value === 'none' ? undefined : (value as RecurrenceInterval);
        updateTask(activeTask.id, { recurrence });
    };

    // Helper for Due Date text
    const getDueDateText = (date?: number) => {
        if (!date) return null;
        if (isToday(date)) return "Due today";
        if (isTomorrow(date)) return "Due tomorrow";
        if (isPast(date)) return "Overdue";
        return `Due ${format(date, 'MMM d')}`;
    };
    const dueDateText = getDueDateText(activeTask.dueDate);


    // Action Wrappers
    const handleComplete = () => {
        completeTask();
        toast("Task completed", { description: activeTask.title, action: { label: "Undo", onClick: () => undo() }, duration: 5000 });
    };
    const handleHold = () => {
        holdTask();
        toast("Task held", { description: "Moved to position #2", action: { label: "Undo", onClick: () => undo() } });
    };
    const handleSkip = () => {
        skipTask();
        toast("Task skipped", { description: "Moved to end of queue", action: { label: "Undo", onClick: () => undo() } });
    };
    const handleDelete = () => {
        deleteTask(activeTask.id);
        toast("Task deleted", { description: activeTask.title, action: { label: "Undo", onClick: () => undo() } });
    };
    const handleDuplicate = () => {
        duplicateTask(activeTask.id);
        toast("Task duplicated", { description: "Added to drafts" });
    };
    const handleConvertToDraft = () => {
        toggleDraft(activeTask.id);
        toast("Moved to Idea Dump", { action: { label: "Undo", onClick: () => undo() } });
    };
    const handleArchive = () => {
        archiveTask(activeTask.id);
        toast("Task archived", { action: { label: "Undo", onClick: () => undo() } });
    };

    return (
        <TooltipProvider delayDuration={500}>
            <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-300 px-4 h-[calc(100dvh-5rem)]">
                <AddTaskModal
                    taskToEdit={activeTask}
                    open={editModalOpen}
                    onOpenChange={setEditModalOpen}
                />

                {/* Main Focus Card - STRICT FIT */}
                <Card className="w-full max-w-3xl h-[calc(100dvh-6rem)] p-4 md:p-12 shadow-lg border bg-card/60 backdrop-blur-sm relative overflow-hidden flex flex-col items-center text-center rounded-3xl group">

                    {/* Focus Atmosphere - Always Visible */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
                        <FocusAtmosphere />
                    </div>

                    {/* Actions Menu (Top Right) */}
                    <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex gap-2">
                        {/* ... menu items ... */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Task (Modal)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDuplicate}>
                                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleConvertToDraft}>
                                    <FileText className="mr-2 h-4 w-4" /> Convert to Draft
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleArchive}>
                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Content Section - Grows to fill space */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full gap-2 md:gap-6 overflow-y-auto">

                        {/* Project Badge */}
                        <div className="flex items-center justify-center pt-8 md:pt-0">
                            <div className="px-3 py-1 rounded-full bg-secondary/50 border text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                                {project ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                                        {project.name}
                                    </>
                                ) : (
                                    "No Project"
                                )}
                            </div>
                        </div>

                        {/* Task Title Row (Inline Edit) */}
                        <div className="flex items-center justify-center gap-3 w-full group/title relative px-2">
                            <input
                                type="text"
                                value={activeTask.title}
                                onChange={(e) => updateTask(activeTask.id, { title: e.target.value })}
                                className="bg-transparent border-none text-2xl md:text-5xl font-bold tracking-tight text-foreground leading-tight text-center w-full focus:outline-none focus:ring-2 focus:ring-ring/20 rounded-md py-1"
                                placeholder="Task Name"
                            />
                        </div>

                        {/* Description (Inline Edit + Scroll) */}
                        <div className="w-full max-w-xl relative group/desc min-h-[40px] shrink-0">
                            <TextareaAutosize
                                value={activeTask.description || ''}
                                onChange={(e) => updateTask(activeTask.id, { description: e.target.value })}
                                placeholder="Add a description..."
                                minRows={1}
                                maxRows={4}
                                className="w-full bg-transparent border-none text-sm md:text-lg text-muted-foreground/80 text-center leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 rounded-md p-1 transition-all"
                            />
                        </div>

                        {/* Focus Timer */}
                        <div className="w-full py-1 shrink-0">
                            <FocusTimer taskId={activeTask.id} />
                        </div>

                        {/* Due Date Line */}
                        <div className="h-5 flex items-center justify-center shrink-0">
                            {dueDateText && (
                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                    <Clock className="h-3 w-3" />
                                    {dueDateText}
                                </div>
                            )}
                        </div>

                        {/* Metadata Chips Row - Compact Grid on Mobile */}
                        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                            {/* Due Date Chip */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={cn(
                                        "px-2.5 py-1 rounded-full border bg-secondary/30 text-xs font-medium flex items-center gap-1.5 transition-all",
                                        activeTask.dueDate ? "text-muted-foreground" : "text-muted-foreground/50 border-dashed"
                                    )}>
                                        <Calendar className="h-3 w-3" />
                                        {activeTask.dueDate ? format(activeTask.dueDate, 'MMM d') : 'Set Date'}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <CalendarComponent
                                        mode="single"
                                        selected={activeTask.dueDate ? new Date(activeTask.dueDate) : undefined}
                                        onSelect={(d) => updateTask(activeTask.id, { dueDate: d ? d.getTime() : undefined })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Priority Chip */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all",
                                        activeTask.priority === 'high' ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200" :
                                            activeTask.priority === 'medium' ? "bg-secondary/30 text-muted-foreground border-transparent" :
                                                "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200"
                                    )}>
                                        <AlertCircle className="h-3 w-3" />
                                        {activeTask.priority.charAt(0).toUpperCase() + activeTask.priority.slice(1)} Priority
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                    <DropdownMenuRadioGroup value={activeTask.priority} onValueChange={handlePrioritySelect}>
                                        <DropdownMenuRadioItem value="low" className="text-blue-500">Low</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="high" className="text-amber-600">High</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Recurring Chip */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all",
                                        activeTask.recurrence ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200" : "bg-secondary/30 text-muted-foreground border-transparent"
                                    )}>
                                        <Repeat className="h-3 w-3" />
                                        {activeTask.recurrence ? 'Recurring' : 'Not Recurring'}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                    <DropdownMenuRadioGroup value={activeTask.recurrence ? String(activeTask.recurrence) : 'none'} onValueChange={handleRecurrenceSelect}>
                                        <DropdownMenuRadioItem value="none">One-time</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="daily">Daily</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="weekly">Weekly</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="monthly">Monthly</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Footer Actions - Pinned to bottom of Card */}
                    <div className="w-full shrink-0 pt-4 pb-2 flex flex-col gap-3">
                        {/* Secondary Actions */}
                        <div className="flex items-center justify-center gap-2">
                            {/* Skip */}
                            <Button variant="outline" size="sm" onClick={handleSkip} className="h-9 px-6 rounded-full text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs shadow-sm">
                                <CornerUpRight className="mr-1.5 h-3.5 w-3.5" /> Skip
                            </Button>

                            {/* Hold */}
                            <Button variant="outline" size="sm" onClick={handleHold} className="h-9 px-6 rounded-full text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs shadow-sm">
                                <Pause className="mr-1.5 h-3.5 w-3.5" /> Hold
                            </Button>
                        </div>

                        {/* Complete Button - Prominent */}
                        <div className="w-full max-w-xs mx-auto">
                            <Button variant="default" size="lg" onClick={handleComplete} className="w-full h-11 rounded-full text-sm font-semibold shadow-md hover:shadow-xl hover:scale-105 transition-all">
                                <Check className="mr-2 h-4 w-4" /> Complete Task
                            </Button>
                        </div>
                    </div>

                </Card>
            </div>
        </TooltipProvider>
    );
}
