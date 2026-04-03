'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { format, isPast, isToday, isTomorrow, isThisWeek, startOfDay, isAfter, isBefore, addDays, getISODay } from 'date-fns';
import { Task } from '@/types';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { CornerUpLeft, ArrowUpCircle, Archive, Trash2, FileText, Edit2, CheckCircle2, Clock, CalendarDays, Eye, EyeOff, AlertCircle, RefreshCw, Repeat, Image as ImageIcon, Hourglass } from 'lucide-react';
import { FormattedText } from '@/components/ui/formatted-text';
import { toast } from 'sonner';
import { AddTaskModal } from '@/components/add-task-modal';
import { ProjectSelect } from '@/components/project-select';

// Grouping Helper Types
type TaskGroup = {
    label: string;
    dateKey: string;
    tasks: Task[];
    colorClass: string;
    isPast: boolean;
};

export function CalendarView() {
    const { tasks, projects, activeProject, setOpenSheet, setActiveModal } = useMonocleStore();
    const [isBelowMd, setIsBelowMd] = useState(false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const checkWindowSize = () => setIsBelowMd(window.innerWidth < 768);
        checkWindowSize();
        window.addEventListener('resize', checkWindowSize);
        return () => window.removeEventListener('resize', checkWindowSize);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const groupedTasks = useMemo(() => {
        // Only active, dated tasks
        let datedTasks = tasks.filter(t => t.launchDate && t.status !== 'done');

        if (activeProject) {
            datedTasks = datedTasks.filter(t => t.projectId === activeProject);
        }

        // Sort chronologically
        datedTasks.sort((a, b) => (a.launchDate as number) - (b.launchDate as number));

        const groups: Record<string, TaskGroup> = {};
        const todayStart = startOfDay(new Date(now)).getTime();

        datedTasks.forEach(task => {
            const taskDate = startOfDay(new Date(task.launchDate as number)).getTime();
            let groupKey = '';
            let label = '';
            let colorClass = 'text-foreground';
            let isPastGroup = false;

            if (taskDate < todayStart) {
                groupKey = 'overdue';
                label = 'Overdue';
                colorClass = 'text-red-500 tracking-widest uppercase text-xs';
                isPastGroup = true;
            } else if (isToday(task.launchDate as number)) {
                groupKey = 'today';
                label = 'Today';
                colorClass = 'text-emerald-500 tracking-widest uppercase text-xs';
            } else if (isTomorrow(task.launchDate as number)) {
                groupKey = 'tomorrow';
                label = 'Tomorrow';
                colorClass = 'text-blue-500 tracking-widest uppercase text-xs';
            } else if (isThisWeek(task.launchDate as number, { weekStartsOn: 1 })) {
                groupKey = format(task.launchDate as number, 'EEEE'); // 'Monday'
                label = format(task.launchDate as number, 'EEEE');
                colorClass = 'text-muted-foreground uppercase text-xs tracking-widest text-[10px]';
            } else {
                groupKey = format(task.launchDate as number, 'yyyy-MM-dd');
                label = format(task.launchDate as number, 'EEE, MMM d');
                colorClass = 'text-muted-foreground uppercase text-[10px] tracking-widest';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = { label, dateKey: groupKey, tasks: [], colorClass, isPast: isPastGroup };
            }
            groups[groupKey].tasks.push(task);
        });

        // Convert to array and sort. Overdue first, then by actual date.
        // Since original array is sorted, we can largely trust the insertion order except Overdue might absorb various old dates.
        const sortedGroups = Object.values(groups).sort((a, b) => {
            if (a.dateKey === 'overdue') return -1;
            if (b.dateKey === 'overdue') return 1;
            
            // Getting a predictable timestamp from the first task of the group is completely safe since tasks are presorted.
            return (a.tasks[0]?.launchDate || 0) - (b.tasks[0]?.launchDate || 0);
        });

        return sortedGroups;
    }, [tasks, activeProject, now]);

    // Handlers
    const handleEdit = (task: Task) => {
        useMonocleStore.getState().setDraftTaskData(task);
        useMonocleStore.getState().setActiveModal('add-task');
    };
    const handleComplete = (id: string) => useMonocleStore.getState().completeTask(id);
    const handleArchive = (id: string) => useMonocleStore.getState().archiveTask(id);
    const handleDelete = (id: string) => {
        useMonocleStore.getState().deleteTask(id);
        toast("Task deleted");
    };
    const handleDump = (id: string) => {
        useMonocleStore.getState().updateTask(id, { isDraft: true, status: 'todo' });
        toast.success("Sent to Idea Dump");
    };
    const handleFocusNow = (id: string) => {
        // Strip out dates/waits if we force focus now
        useMonocleStore.getState().updateTask(id, { isDraft: false, skippedUntil: undefined, launchDate: undefined, status: 'todo' });
        useMonocleStore.getState().jumpTaskToTop(id);
        useMonocleStore.getState().setView('focus');
    };

    return (
        <>
            <div className={cn("flex flex-col h-full bg-background/95 backdrop-blur p-0 gap-0", "w-full max-w-3xl mx-auto md:border-x shadow-2xl h-[95vh] md:rounded-xl md:my-4")}>
                
                {/* Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b flex flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xl sm:text-2xl font-bold flex items-center gap-2 rounded-md px-1 -ml-1 text-left">
                        <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                        <span>Upcoming</span>
                        {activeProject && <span className="text-sm font-normal text-muted-foreground ml-1">(Filtered)</span>}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 md:p-4 pb-0">
                        {/* Project Filter Top Row */}
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <ProjectSelect variant="ghost" className="h-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground bg-transparent border-none shadow-none hover:bg-muted/50 px-2 -ml-2 min-w-0" />
                                {activeProject && (
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        title={projects.find(p => p.id === activeProject)?.excludeFromQueue ? "Project tasks are hidden from main queue. Click to show." : "Project tasks appear in main queue. Click to hide."}
                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            const p = projects.find(p => p.id === activeProject);
                                            if (p) {
                                                useMonocleStore.getState().updateProject(p.id, { excludeFromQueue: !p.excludeFromQueue });
                                            }
                                        }}
                                    >
                                        {projects.find(p => p.id === activeProject)?.excludeFromQueue ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" /> : <Eye className="h-3.5 w-3.5 opacity-30 hover:opacity-100 transition-opacity" />}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Scrolling Content */}
                        <div className="flex-1 min-h-0">
                            <div className="h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden pt-1 pb-32 -mx-4 px-4 space-y-8">
                                {groupedTasks.length === 0 && (
                                    <div className="text-center py-10 px-6 text-muted-foreground/60 text-sm border-2 border-dashed rounded-xl flex flex-col items-center gap-2 mt-8">
                                        <CalendarDays className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                        <p className="font-medium text-foreground/80">{activeProject ? `No upcoming tasks in ${projects.find(p => p.id === activeProject)?.name || 'this project'}.` : "No upcoming tasks."}</p>
                                        <p className="text-xs max-w-xs leading-relaxed">Add a due date to a task to see it tracked here chronologically.</p>
                                    </div>
                                )}

                                {groupedTasks.map((group) => (
                                    <div key={group.dateKey} className="space-y-3">
                                        {/* Date Divider */}
                                        <div className="flex items-center gap-3">
                                            <h3 className={cn("font-bold flex items-center gap-2", group.colorClass)}>
                                                {group.isPast ? <AlertCircle className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5 opacity-50" />}
                                                {group.label}
                                            </h3>
                                            <div className="h-[1px] flex-1 bg-border/50" />
                                        </div>

                                        {/* Task List */}
                                        <div className="space-y-2">
                                            {group.tasks.map((task) => (
                                                <ContextMenu key={task.id}>
                                                    <ContextMenuTrigger
                                                        className="flex-1 min-w-0"
                                                        onDoubleClick={(e) => {
                                                            e.preventDefault();
                                                            handleEdit(task);
                                                        }}
                                                    >
                                                        <div className={cn(
                                                            "group bg-card border rounded-lg shadow-sm hover:shadow-md transition-all select-none outline-none flex items-center gap-3 py-2 px-3 relative overflow-hidden",
                                                        )}>
                                                            <div className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center">
                                                                <div className="flex items-center gap-2 relative z-10 w-full overflow-hidden shrink-0">
                                                                    {(() => {
                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                        if (!proj) return null;
                                                                        const IconCmp = getIconComponent(proj.icon);
                                                                        return (
                                                                            <div className="flex justify-center items-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: proj.color }}>
                                                                                <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    
                                                                    <div className="flex items-center justify-between w-full min-w-0">
                                                                        <p className="text-sm font-medium truncate flex-1 leading-relaxed max-w-[85%]">
                                                                            <FormattedText text={task.title} />
                                                                        </p>
                                                                        {task.isFrog && <span className="text-sm leading-none shrink-0 ml-1">🐸</span>}
                                                                        {task.isLightning && !task.isFrog && <span className="text-sm leading-none shrink-0 ml-1">⚡️</span>}
                                                                    </div>
                                                                </div>

                                                                {task.description && (
                                                                    <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-0.5 max-w-[90%] select-text">
                                                                        <FormattedText text={task.description} />
                                                                    </p>
                                                                )}
                                                                
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                    {(() => {
                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                        if (!proj) return null;
                                                                        return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                    })()}
                                                                    
                                                                    {task.recurrence && (
                                                                        <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}>
                                                                            <Repeat className="h-3 w-3" />
                                                                        </span>
                                                                    )}
                                                                    {task.attachments && task.attachments.length > 0 && (
                                                                        <span className="flex items-center gap-1 text-muted-foreground/60" title="Has attachments">
                                                                            <ImageIcon className="h-3 w-3" />
                                                                        </span>
                                                                    )}
                                                                    {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                    {task.priority === 'low' && <AlertCircle className="h-3 w-3 text-blue-500" />}
                                                                    
                                                                    {task.status === 'waiting' && (
                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500">WAITING</span>
                                                                    )}
                                                                    {!task.isDraft && task.status !== 'waiting' && task.skippedUntil && task.skippedUntil > now && (
                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">HOLD</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full relative" type="button" onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }} title="Complete Task"><CheckCircle2 className="h-3 w-3" /></Button>
                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                            </div>
                                                        </div>
                                                    </ContextMenuTrigger>
                                                    <ContextMenuContent>
                                                        <ContextMenuItem onClick={() => handleFocusNow(task.id)}>
                                                            <CornerUpLeft className="mr-2 h-4 w-4" /> Focus Now (Removes Date)
                                                        </ContextMenuItem>
                                                        <ContextMenuItem onClick={() => handleEdit(task)}>
                                                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                                                        </ContextMenuItem>
                                                        <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}>
                                                            <FileText className="mr-2 h-4 w-4" /> Duplicate
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem onClick={() => handleDump(task.id)}>
                                                            <Archive className="mr-2 h-4 w-4" /> Send to Idea Dump
                                                        </ContextMenuItem>
                                                        <ContextMenuItem onClick={() => handleArchive(task.id)}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Archive
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                        <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </ContextMenuItem>
                                                    </ContextMenuContent>
                                                </ContextMenu>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
}
