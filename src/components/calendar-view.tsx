'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { format, isPast, isToday, isTomorrow, isThisWeek, startOfDay, isAfter, isBefore, addDays, getISODay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Task } from '@/types';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { CornerUpLeft, ArrowUpCircle, Archive, Trash2, FileText, Edit2, CheckCircle2, Clock, CalendarDays, Eye, EyeOff, AlertCircle, RefreshCw, Repeat, Image as ImageIcon, Hourglass, List, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormattedText } from '@/components/ui/formatted-text';
import { toast } from 'sonner';
import { ProjectSelect } from '@/components/project-select';

// Grouping Helper Types
type TaskGroup = {
    label: string;
    dateKey: string;
    tasks: Task[];
    colorClass: string;
    isPast: boolean;
};

// Reusable Task Row Component for DRY
function TaskRow({ task, handleEdit, handleComplete, handleFocusNow, handleDump, handleArchive, handleDelete }: { 
    task: Task, 
    handleEdit: (t: Task) => void, 
    handleComplete: (id: string) => void, 
    handleFocusNow: (id: string) => void,
    handleDump: (id: string) => void,
    handleArchive: (id: string) => void,
    handleDelete: (id: string) => void
}) {
    const { projects } = useMonocleStore();
    const now = Date.now();

    return (
        <ContextMenu>
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
    );
}

export function CalendarView() {
    const { tasks, projects, activeProject } = useMonocleStore();
    const [isBelowMd, setIsBelowMd] = useState(false);
    const [now, setNow] = useState(Date.now());
    
    // View State
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));

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

    const baseDatedTasks = useMemo(() => {
        let _datedTasks = tasks.filter(t => t.launchDate && t.status !== 'done');
        if (activeProject) {
            _datedTasks = _datedTasks.filter(t => t.projectId === activeProject);
        }
        return _datedTasks.sort((a, b) => (a.launchDate as number) - (b.launchDate as number));
    }, [tasks, activeProject]);

    // ---- LIST MODE DATA ----
    const groupedTasks = useMemo(() => {
        const groups: Record<string, TaskGroup> = {};
        const todayStart = startOfDay(new Date(now)).getTime();

        baseDatedTasks.forEach(task => {
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
                groupKey = format(task.launchDate as number, 'EEEE');
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

        return Object.values(groups).sort((a, b) => {
            if (a.dateKey === 'overdue') return -1;
            if (b.dateKey === 'overdue') return 1;
            return (a.tasks[0]?.launchDate || 0) - (b.tasks[0]?.launchDate || 0);
        });
    }, [baseDatedTasks, now]);

    // ---- GRID MODE DATA ----
    const monthMatrix = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }); // Sunday
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const tasksByDateStr = useMemo(() => {
        const map: Record<string, Task[]> = {};
        baseDatedTasks.forEach(t => {
            const dateStr = format(startOfDay(new Date(t.launchDate as number)), 'yyyy-MM-dd');
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(t);
        });
        return map;
    }, [baseDatedTasks]);

    const selectedDateTasks = useMemo(() => {
        if (!selectedDate) return [];
        return tasksByDateStr[format(selectedDate, 'yyyy-MM-dd')] || [];
    }, [selectedDate, tasksByDateStr]);

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
        useMonocleStore.getState().updateTask(id, { isDraft: false, skippedUntil: undefined, launchDate: undefined, status: 'todo' });
        useMonocleStore.getState().jumpTaskToTop(id);
        useMonocleStore.getState().setView('focus');
    };

    return (
        <div className={cn("flex flex-col h-full bg-background/95 backdrop-blur p-0 gap-0", "w-full max-w-3xl mx-auto md:border-x shadow-2xl h-[95vh] sm:h-[90vh] md:h-[85vh] md:rounded-xl md:my-4")}>
            
            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b flex flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="text-xl sm:text-2xl font-bold flex items-center gap-2 rounded-md px-1 -ml-1 text-left line-clamp-1">
                        <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                        <span>Upcoming</span>
                        {activeProject && <span className="text-sm font-normal text-muted-foreground ml-1 hidden sm:inline">(Filtered)</span>}
                    </div>
                </div>
                
                <div className="flex bg-muted/50 p-0.5 rounded-lg border shrink-0">
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        <List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">List</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')} 
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        <Grid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Grid</span>
                    </button>
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
                        {viewMode === 'list' ? (
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
                                                <TaskRow key={task.id} task={task} handleEdit={handleEdit} handleComplete={handleComplete} handleFocusNow={handleFocusNow} handleDump={handleDump} handleArchive={handleArchive} handleDelete={handleDelete} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden pt-1 pb-32 -mx-4 px-4 flex flex-col">
                                {/* Month Navigation */}
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h2 className="text-lg sm:text-xl font-bold tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setCurrentMonth(startOfMonth(new Date())); setSelectedDate(startOfDay(new Date())); }} className="text-xs shrink-0 mx-1">
                                            Today
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Grid Matrix */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-6 select-none shrink-0 border-b pb-6 px-1">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                        <div key={day} className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase text-center tracking-wider mb-2">
                                            {isBelowMd ? day.charAt(0) : day}
                                        </div>
                                    ))}
                                    {monthMatrix.map((day) => {
                                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                                        const isCurrMonth = isSameMonth(day, currentMonth);
                                        const dayDateStr = format(day, 'yyyy-MM-dd');
                                        let dayTasks = tasksByDateStr[dayDateStr] || [];

                                        return (
                                            <div 
                                                key={day.toISOString()} 
                                                onClick={() => setSelectedDate(day)}
                                                className={cn(
                                                    "relative p-1 sm:p-2 border rounded-md cursor-pointer transition-all flex flex-col items-center sm:items-start min-h-[40px] sm:min-h-[100px]",
                                                    !isCurrMonth && "opacity-40 bg-muted/20",
                                                    isSelected ? "ring-2 ring-primary border-primary bg-primary/5 shadow-sm" : "hover:border-foreground/30 bg-card",
                                                    isSameDay(day, new Date()) && "bg-blue-500/10 border-blue-500/30"
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-xs sm:text-sm font-semibold mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0",
                                                    isSameDay(day, new Date()) && "bg-blue-500 text-white"
                                                )}>
                                                    {format(day, 'd')}
                                                </span>

                                                {/* Grid Task Content Content */}
                                                {dayTasks.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap sm:flex-col w-full items-center sm:items-stretch overflow-hidden">
                                                        {isBelowMd ? (
                                                            // Mobile layout: Tiny dashes below the number
                                                            <div className="flex gap-[2px] flex-wrap justify-center w-full mt-0.5">
                                                                {dayTasks.slice(0, 4).map((t, i) => {
                                                                    const p = t.projectId ? projects.find(proj => proj.id === t.projectId) : null;
                                                                    return (
                                                                        <div key={i} className="h-1.5 w-3 rounded-sm" style={{ backgroundColor: p?.color || '#888' }} />
                                                                    );
                                                                })}
                                                                {dayTasks.length > 4 && (
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            // Desktop Layout: Text Chips
                                                            <div className="flex flex-col gap-1 w-full mt-1">
                                                                {dayTasks.slice(0, 3).map((t, i) => {
                                                                    const p = t.projectId ? projects.find(proj => proj.id === t.projectId) : null;
                                                                    return (
                                                                        <div key={t.id} onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className="flex items-center gap-1.5 text-[9px] bg-background border py-1 px-1.5 rounded w-full truncate shadow-sm hover:border-primary/50 transition-colors">
                                                                            {p && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                                                                            <span className="truncate flex-1 font-medium select-none">{t.title}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {dayTasks.length > 3 && (
                                                                    <div className="text-[9px] font-bold text-muted-foreground text-left mt-0.5 ml-1">
                                                                        +{dayTasks.length - 3} more
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Detail List */}
                                <div className="flex-1 pb-10 px-1 sm:px-2">
                                    <h3 className="font-bold text-sm sm:text-base text-foreground mb-4 flex items-center gap-2 tracking-tight">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        {selectedDate && isSameDay(selectedDate, new Date()) ? 'Today' : selectedDate ? format(selectedDate, 'EEEE, MMMM do yyyy') : 'Select a date'}
                                        <span className="text-muted-foreground font-normal ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task' : 'tasks'}</span>
                                    </h3>
                                    
                                    {selectedDateTasks.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground/50 text-sm border border-dashed rounded-xl">
                                            No tasks scheduled for this day.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedDateTasks.map((task) => (
                                                <TaskRow key={task.id} task={task} handleEdit={handleEdit} handleComplete={handleComplete} handleFocusNow={handleFocusNow} handleDump={handleDump} handleArchive={handleArchive} handleDelete={handleDelete} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
