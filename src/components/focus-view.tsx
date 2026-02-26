'use client';

import * as React from 'react';
import { useMonocleStore } from '@/lib/store';
import { FocusTimer } from './focus-timer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, CheckCircle2, Pause, CornerUpRight, Shuffle, AlertCircle, Clock, Calendar, Repeat, MoreHorizontal, Edit, Copy, FileText, Trash2, Archive, X, Smile, Star, Dices, ChevronUp, Plus, Music, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns';
import { toast } from "sonner"
import confetti from 'canvas-confetti';
import { soundEngine } from '@/lib/sound-engine';
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Calendar as CalendarComponent } from '@/components/ui/calendar'; // Renamed to avoid collision
import { AddTaskModal } from './add-task-modal';
import TextareaAutosize from 'react-textarea-autosize';
import { RecurrenceInterval } from '@/types';
import { FocusAtmosphere } from './focus-atmosphere';
import { SwipeableTask } from './ui/swipeable-task';
import { HoldButton } from './ui/hold-button';
import { getIconComponent } from '@/lib/icons';
import { AnimatedLogo } from './animated-logo';
import { FormattedText } from './ui/formatted-text';

interface FocusViewProps {
    onExit?: () => void;
}

function FocusEmptyState({ setView }: { setView: (view: any) => void }) {
    const victoryPhrases = [
        "The desk is clear.",
        "Execution complete.",
        "All frogs eaten.",
        "Mission accomplished.",
        "Zero tasks left."
    ];

    const [phrase] = React.useState(() => victoryPhrases[Math.floor(Math.random() * victoryPhrases.length)]);

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <AnimatedLogo />
            <div className="space-y-4 max-w-sm">
                <h3 className="text-xl font-medium tracking-tight text-foreground">{phrase}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Add a new objective, or check the Idea Dump.
                </p>
            </div>
            <div className="flex gap-4 pt-4">
                <Button onClick={() => setView('capture')} className="rounded-full shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all font-medium px-6 h-10">
                    <Plus className="mr-2 h-4 w-4" />
                    Capture Task
                </Button>
                <Button variant="outline" onClick={() => setView('ideas')} className="rounded-full border-muted-foreground/20 hover:bg-muted text-muted-foreground transition-all font-medium px-6 h-10 shadow-sm">
                    <Archive className="mr-2 h-4 w-4" />
                    Idea Dump
                </Button>
            </div>
        </div>
    );
}

export function FocusView({ onExit }: FocusViewProps) {
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
        toggleFrog,
        setOpenSheet,
        updateTask,
        settings,
        setView,
        snoozeTask,
        getAutoPickedTask,
        setActiveModal
    } = useMonocleStore();

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = React.useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
    const [isDetailsSheetOpen, setIsDetailsSheetOpen] = React.useState(false);
    const [isCompleting, setIsCompleting] = React.useState(false);

    const [renderTick, setRenderTick] = React.useState(0);

    // Auto-refresh to handle snooze expirations natively
    React.useEffect(() => {
        const interval = setInterval(() => {
            setRenderTick(prev => prev + 1);
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const activeTask = getAutoPickedTask();

    const project = activeTask?.projectId ? projects.find(p => p.id === activeTask.projectId) : null;

    // Detect if Mobile to enable swipe
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


    // Handlers
    const handleDateSelect = (date: Date | undefined) => {
        if (!activeTask) return;
        updateTask(activeTask.id, { dueDate: date ? date.getTime() : undefined });
        setIsCalendarOpen(false);
    };

    const handlePrioritySelect = (value: string) => {
        if (!activeTask) return;
        updateTask(activeTask.id, { priority: value as 'low' | 'medium' | 'high' });
    };

    const handleRecurrenceSelect = (value: string) => {
        if (!activeTask) return;
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
    const dueDateText = getDueDateText(activeTask?.dueDate);


    // Action Wrappers
    const handleComplete = () => {
        if (!activeTask || isCompleting) return;
        setIsCompleting(true);

        // Visual reward
        if (activeTask.isFrog) {
            const duration = 2000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#10b981', '#34d399', '#059669']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#10b981', '#34d399', '#059669']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        } else {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        setTimeout(() => {
            const result = completeTask();
            setIsCompleting(false);

            if (result?.nextTask) {
                toast("Recurring task completed", {
                    description: `Next instance scheduled for ${format(result.nextTask.dueDate || Date.now(), 'MMM d')}`,
                    action: { label: "Undo", onClick: () => undo() },
                    duration: 5000
                });
            } else {
                toast("Task completed", {
                    description: activeTask.title,
                    action: { label: "Undo", onClick: () => undo() },
                    duration: 5000
                });
            }
        }, 600); // Wait for the card animation to finish before removing the item from DOM
    };
    const handleHold = (durationMinutes: number, label: string) => {
        snoozeTask(durationMinutes);
        toast("Task Held", { description: `Held until ${label}`, action: { label: "Undo", onClick: () => undo() } });
    };
    const handleSkip = () => {
        const isFrogSkipping = activeTask?.isFrog;
        skipTask();
        toast("Task passed", {
            description: isFrogSkipping ? "The Frog Will Return...SOON." : "Moved to bottom of Queue",
            action: { label: "Undo", onClick: () => undo() }
        });
    };
    const handleDelete = () => {
        if (!activeTask) return;
        deleteTask(activeTask.id);
        toast("Task deleted", { description: activeTask.title, action: { label: "Undo", onClick: () => undo() } });
    };
    const handleDuplicate = () => {
        if (!activeTask) return;
        duplicateTask(activeTask.id);
        toast("Task duplicated", { description: "Added to drafts" });
    };
    const handleConvertToDraft = () => {
        if (!activeTask) return;
        toggleDraft(activeTask.id);
        toast("Moved to Idea Dump", { action: { label: "Undo", onClick: () => undo() } });
    };
    const handleArchive = () => {
        if (!activeTask) return;
        archiveTask(activeTask.id);
        toast("Task archived", { action: { label: "Undo", onClick: () => undo() } });
    };

    return (
        <TooltipProvider delayDuration={500}>
            {onExit && (
                <button
                    className="fixed top-6 right-6 md:top-8 md:right-8 z-[60] p-2.5 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md border border-white/10 text-muted-foreground hover:text-foreground hover:scale-105 transition-all flex items-center justify-center shadow-lg"
                    onClick={(e) => {
                        e.stopPropagation();
                        onExit();
                    }}
                    aria-label="Exit Focus Mode"
                >
                    <X className="h-6 w-6" />
                </button>
            )}
            <div
                className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-300 px-4 h-full cursor-pointer"
                onClick={() => {
                    if (isDetailsSheetOpen) {
                        setIsDetailsSheetOpen(false);
                    } else if (onExit) {
                        onExit();
                    }
                }}
            >
                {activeTask && (
                    <AddTaskModal
                        taskToEdit={activeTask}
                        open={editModalOpen}
                        onOpenChange={setEditModalOpen}
                    />
                )}

                {/* Main Focus Card - STRICT FIT OR Empty State */}
                {activeTask ? (
                    <SwipeableTask
                        task={activeTask}
                        isMobile={isMobile}
                        upAction={() => { if (onExit) onExit(); else setView('queue'); }}
                        upIcon={ChevronUp}
                        upLabel="Back to Queue"
                        upBgClass="bg-background-muted"
                        upColorClass="text-muted-foreground"

                        leftAction={activeTask.isFrog ? undefined : () => useMonocleStore.getState().randomTask()}
                        leftIcon={Dices}
                        leftLabel="Random"
                        leftBgClass="bg-indigo-500"
                        leftColorClass="text-indigo-600"

                        downThresholdAction={activeTask.isFrog ? undefined : (id, mins, label) => handleHold(mins, label)}
                        downIcon={Pause}
                        downLabel="Hold"
                        downBgClass="bg-orange-500"
                        downColorClass="text-orange-600"

                        rightAction={() => handleSkip()}
                        rightIcon={Shuffle}
                        rightLabel="Skip"
                        rightBgClass="bg-blue-500"
                        rightColorClass="text-blue-600"
                    >
                        <Card
                            className={cn(
                                "w-full max-w-3xl flex-1 max-h-[85vh] lg:max-h-[800px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-4 md:p-8 shadow-lg border bg-card/60 backdrop-blur-sm relative flex flex-col items-center text-center rounded-3xl group cursor-default transition-all duration-500",
                                activeTask.isFrog ? "ring-2 ring-emerald-500 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] border-emerald-500/50" : "",
                                activeTask.isLightning && !activeTask.isFrog ? "ring-2 ring-yellow-500 shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)] border-yellow-500/5 bg-yellow-500/5" : "",
                                isCompleting && "scale-95 opacity-0 translate-y-8 duration-500 ease-in pointer-events-none"
                            )}
                            onClick={(e) => {
                                // Default behavior: if sheet isn't open, interact with card (or do nothing)
                                // If sheet IS open, let the event bubble up so the background handler closes it
                                if (!isDetailsSheetOpen) {
                                    e.stopPropagation();
                                }
                            }}
                        >

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
                                        <DropdownMenuItem onSelect={(e) => {
                                            e.preventDefault();
                                            setTimeout(() => setEditModalOpen(true), 0);
                                        }}>
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

                            {/* Tappable Background Area for the Details Sheet */}
                            <div
                                className="flex-1 flex flex-col items-center justify-center w-full gap-2 md:gap-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-pointer"
                                onClick={() => setIsDetailsSheetOpen(true)}
                            >

                                {/* Momentum Mode Indicator */}
                                {(activeTask.isFrog || activeTask.isLightning) && (
                                    <div className="flex flex-col items-center justify-center pt-8 md:pt-4 pb-2 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="text-5xl md:text-6xl drop-shadow-md mb-2">
                                            {activeTask.isFrog ? '🐸' : '⚡'}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-widest",
                                            activeTask.isFrog ? "text-emerald-600 dark:text-emerald-500" : "text-yellow-600 dark:text-yellow-500"
                                        )}>
                                            {activeTask.isFrog ? 'Eat The Frog' : 'Lightning Strike'}
                                        </span>
                                    </div>
                                )}

                                {/* Project Badge */}
                                <div className={cn("flex items-center justify-center", !(activeTask.isFrog || activeTask.isLightning) && "pt-8 md:pt-0")}>
                                    <div className="px-3 py-1 rounded-full bg-secondary/50 border text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        {project ? (
                                            <>
                                                <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: project.color }}>
                                                    {(() => {
                                                        const IconCmp = getIconComponent(project.icon);
                                                        return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                                    })()}
                                                </div>
                                                {project.name}
                                            </>
                                        ) : (
                                            "No Project"
                                        )}
                                    </div>
                                </div>

                                {/* Task Title Row (Tappable for details) */}
                                <div
                                    className="flex items-center justify-center gap-3 w-full group/title relative px-2 py-4 cursor-pointer hover:bg-foreground/5 dark:hover:bg-foreground/10 rounded-xl transition-colors"
                                    onClick={() => setIsDetailsSheetOpen(true)}
                                >
                                    <h1
                                        className={cn(
                                            "bg-transparent border-none text-3xl md:text-5xl font-bold tracking-tight leading-tight text-center w-full focus:outline-none focus:ring-2 focus:ring-ring/20 rounded-md py-1 transition-all duration-500",
                                            activeTask.isLightning && !activeTask.isFrog ? "text-yellow-600 dark:text-yellow-400" : "text-foreground",
                                            isCompleting && "line-through text-muted-foreground/50 opacity-50 scale-105"
                                        )}
                                    >
                                        <FormattedText text={activeTask.title} />
                                    </h1>
                                </div>

                                {/* Focus Timer */}
                                <div className="w-full py-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <FocusTimer taskId={activeTask.id} />
                                </div>
                            </div>

                            {/* Visual Indicator for Sheet (Tappable too) */}
                            <div className="w-full shrink-0 flex flex-col items-center justify-center opacity-40 cursor-pointer mt-2" onClick={() => setIsDetailsSheetOpen(true)}>
                                <ChevronUp className="h-5 w-5 text-muted-foreground hidden md:block animate-bounce" />
                                <div className="w-10 h-1.5 rounded-full bg-foreground/20 md:hidden"></div>
                            </div>

                            {/* Details Dialog - Holds Description and Metadata */}
                            {/* Details Drawer - Holds Description and Metadata */}
                            <Drawer open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen} dismissible={true} modal={false}>
                                <DrawerContent
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                    className="p-4 pt-4 pb-12 h-auto border-t rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)]"
                                >
                                    <DrawerHeader className="pb-4">
                                        <DrawerTitle className="text-center font-bold">
                                            <input
                                                type="text"
                                                value={activeTask.title}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => updateTask(activeTask.id, { title: e.target.value })}
                                                maxLength={255}
                                                className="bg-transparent border-none text-2xl font-bold tracking-tight text-center w-full focus:outline-none focus:ring-2 focus:ring-ring/20 rounded-md py-1 cursor-text"
                                                placeholder="Task Name"
                                            />
                                        </DrawerTitle>
                                    </DrawerHeader>

                                    <div className="flex flex-col gap-6 w-full pt-4 max-w-2xl mx-auto items-center">
                                        {/* Description */}
                                        <div className="w-full relative group/desc min-h-[40px] shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <TextareaAutosize
                                                value={activeTask.description || ''}
                                                onChange={(e) => updateTask(activeTask.id, { description: e.target.value })}
                                                placeholder="Add a description..."
                                                minRows={1}
                                                maxRows={4}
                                                maxLength={2000}
                                                className="w-full bg-secondary/50 border-none text-sm md:text-base text-foreground/80 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 rounded-xl p-4 transition-all"
                                            />
                                        </div>

                                        {/* Metadata Chips Row */}
                                        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {/* Due Date Chip */}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button className={cn(
                                                        "px-3 py-1.5 rounded-full border bg-secondary/30 text-sm font-medium flex items-center gap-2 transition-all",
                                                        activeTask.dueDate ? "text-muted-foreground" : "text-muted-foreground/50 border-dashed"
                                                    )}>
                                                        <Calendar className="h-4 w-4" />
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
                                                        "px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-all",
                                                        activeTask.priority === 'high' ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200" :
                                                            activeTask.priority === 'medium' ? "bg-secondary/30 text-muted-foreground border-transparent" :
                                                                "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200"
                                                    )}>
                                                        <AlertCircle className="h-4 w-4" />
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

                                            {/* Lightning Chip */}
                                            <button
                                                onClick={() => updateTask(activeTask.id, { isLightning: !activeTask.isLightning })}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-all",
                                                    activeTask.isLightning ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 ring-2 ring-yellow-500/20" : "bg-secondary/30 text-muted-foreground border-transparent hover:border-yellow-200 hover:text-yellow-600"
                                                )}
                                            >
                                                <span className="text-sm leading-none">⚡</span>
                                                {activeTask.isLightning ? 'Lightning Fast' : 'Mark Lightning'}
                                            </button>

                                            {/* Frog Chip */}
                                            <button
                                                onClick={() => toggleFrog(activeTask.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-all",
                                                    activeTask.isFrog ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 ring-2 ring-emerald-500/20" : "bg-secondary/30 text-muted-foreground border-transparent hover:border-emerald-200 hover:text-emerald-600"
                                                )}
                                            >
                                                <span className="text-sm leading-none">🐸</span>
                                                {activeTask.isFrog ? 'Daily Frog' : 'Mark as Frog'}
                                            </button>

                                            {/* Recurring Chip */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className={cn(
                                                        "px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-all",
                                                        activeTask.recurrence ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200" : "bg-secondary/30 text-muted-foreground border-transparent"
                                                    )}>
                                                        <Repeat className="h-4 w-4" />
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

                                        {/* Friction Score */}
                                        {(activeTask.friction?.skips || activeTask.friction?.holds) ? (
                                            <div className="text-xs text-muted-foreground/50 font-medium flex gap-3 items-center justify-center">
                                                {!!activeTask.friction.skips && <span>Skipped: {activeTask.friction.skips}</span>}
                                                {!!activeTask.friction.skips && !!activeTask.friction.holds && <span>•</span>}
                                                {!!activeTask.friction.holds && <span>Held: {activeTask.friction.holds}</span>}
                                            </div>
                                        ) : null}
                                    </div>
                                </DrawerContent>
                            </Drawer>

                            {/* Footer Actions - Pinned to bottom of Card */}
                            <div className="w-full shrink-0 pt-4 pb-2 flex flex-col gap-3">
                                {/* Secondary Actions */}
                                <div className="flex items-center justify-center gap-2">
                                    {/* Random */}
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); randomTask(); }} title="Pick a random task" className="h-9 px-6 rounded-full text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs shadow-sm flex">
                                        <Dices className="mr-1.5 h-3.5 w-3.5" /> Random
                                    </Button>

                                    {/* Snooze Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="inline-block"> {/* Wrapper needed for DropdownMenuTrigger when button is disabled */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="inline-block"> {/* Wrapper needed for disabled button in Tooltip */}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={activeTask.isFrog}
                                                                className={cn(
                                                                    "h-9 px-6 rounded-full text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs shadow-sm",
                                                                    activeTask.isFrog && "opacity-50 cursor-not-allowed hidden" // Optionally hide or just dim. Let's dim and disable.
                                                                )}
                                                            >
                                                                <Pause className="mr-1.5 h-3.5 w-3.5" /> Hold
                                                            </Button>
                                                        </span>
                                                    </TooltipTrigger>
                                                    {activeTask.isFrog && (
                                                        <TooltipContent side="top">
                                                            <p className="text-xs">The Daily Frog cannot be placed on hold.</p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </div>
                                        </DropdownMenuTrigger>
                                        {!activeTask.isFrog && (
                                            <DropdownMenuContent align="center" className="w-48">
                                                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Hold For...</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleHold(30, "30 minutes later")}>
                                                    <Clock className="mr-2 h-4 w-4" /> 30 minutes
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleHold(60, "1 hour later")}>
                                                    <Clock className="mr-2 h-4 w-4" /> 1 hour
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleHold(240, "4 hours later")}>
                                                    <Clock className="mr-2 h-4 w-4" /> 4 hours
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleHold(1440, "tomorrow")}>
                                                    <Calendar className="mr-2 h-4 w-4" /> Tomorrow
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        )}
                                    </DropdownMenu>

                                    {/* Skip */}
                                    <Button variant="outline" size="sm" onClick={handleSkip} title="Move to bottom of Queue" className="h-9 px-6 rounded-full text-muted-foreground hover:text-foreground border-muted-foreground/20 text-xs shadow-sm">
                                        <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Skip
                                    </Button>
                                </div>

                                {/* Complete Button - Prominent */}
                                <div className="w-full max-w-xs mx-auto flex justify-center">
                                    {activeTask.isFrog ? (
                                        <HoldButton
                                            onComplete={handleComplete}
                                            holdTime={1500}
                                            label="Hold to Win"
                                        />
                                    ) : (
                                        <Button variant="default" size="lg" onClick={handleComplete} className="w-full h-11 rounded-full text-sm font-semibold shadow-md hover:shadow-xl hover:scale-105 transition-all">
                                            <Check className="mr-2 h-4 w-4" /> Complete Task
                                        </Button>
                                    )}
                                </div>
                            </div>

                        </Card>
                    </SwipeableTask>
                ) : (
                    <FocusEmptyState setView={setView} />
                )}
            </div>
        </TooltipProvider >
    );
}
