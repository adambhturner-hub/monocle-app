'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateId } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Clock, Repeat, Plus, X, ArrowUpRight, Hash, AlertCircle, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMonocleStore } from '@/lib/store';
import { Project, Task } from '@/types';
import { parseTaskInput, ParsedTask } from '@/lib/smart-parser';
import { Badge } from '@/components/ui/badge';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from '@/components/mentions-list';

interface AddTaskModalProps {
    taskToEdit?: Task;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddTaskModal({ taskToEdit, open: controlledOpen, onOpenChange }: AddTaskModalProps) {
    const { addTask, updateTask, projects, activeProject, setOpenSheet } = useMonocleStore();
    const [internalOpen, setInternalOpen] = useState(false);
    const [showMore, setShowMore] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange! : setInternalOpen;

    const isEditMode = !!taskToEdit;

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [projectId, setProjectId] = useState<string>('all');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [recurrence, setRecurrence] = useState<string>('none');
    const [isFrog, setIsFrog] = useState(false);
    const [isLightning, setIsLightning] = useState(false);

    // Multi-task paste state
    const [pendingPaste, setPendingPaste] = useState<string[] | null>(null);

    // Parser State
    const [parsedData, setParsedData] = useState<ParsedTask | null>(null);

    // Refs
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Mentions Hook
    const { activeTrigger, filterText, isOpen: isMentionsOpen, onInputChange: onMentionChange, triggerIndex, closeMentions } = useMentions({ inputRef: titleInputRef });
    const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

    // Derived Mention Options
    const mentionOptions: MentionOption[] = useMemo(() => {
        if (!activeTrigger) return [];
        const lowerFilter = filterText.toLowerCase();

        if (activeTrigger === '@') {
            return projects
                .filter(p => p.name.toLowerCase().includes(lowerFilter))
                .slice(0, 5)
                .map(p => ({
                    label: p.name,
                    value: p.id,
                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                }));
        }
        if (activeTrigger === '!') {
            const priorities = [
                { label: 'high', value: 'high', icon: <AlertCircle className="w-3 h-3 text-red-500" /> },
                { label: 'medium', value: 'medium', icon: <AlertCircle className="w-3 h-3 text-yellow-500" /> },
                { label: 'low', value: 'low', icon: <AlertCircle className="w-3 h-3 text-blue-500" /> },
                { label: 'urgent', value: 'urgent', icon: <AlertCircle className="w-3 h-3 text-red-600" /> }
            ];
            return priorities.filter(p => p.label.includes(lowerFilter));
        }
        return [];
    }, [activeTrigger, filterText, projects]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMentionSelectedIndex(0);
    }, [mentionOptions.length, activeTrigger]);

    const handleMentionSelect = (option: MentionOption) => {
        const input = titleInputRef.current;
        if (!input || !activeTrigger) return;

        const text = input.value;
        const before = text.slice(0, triggerIndex);
        const after = text.slice(triggerIndex + 1 + filterText.length);

        // Insert: Trigger + Label + Space
        // e.g. "@DeepWork " or "!high "
        const insertion = activeTrigger + option.label + ' ';
        const newValue = before + insertion + after;

        setTitle(newValue);

        // Restore focus and cursor
        setTimeout(() => {
            input.focus();
            const newCursorPos = before.length + insertion.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        closeMentions();
    };

    // Initializer ...
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setParsedData(null); // Reset parser on open
            if (taskToEdit) {
                // ... existing fill logic
                setTitle(taskToEdit.title);
                setDescription(taskToEdit.description || '');
                setPriority(taskToEdit.priority);
                setProjectId(taskToEdit.projectId || 'all');
                setDueDate(taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined);
                setRecurrence(taskToEdit.recurrence?.toString() || 'none');
                setIsFrog(taskToEdit.isFrog || false);
                setIsLightning(taskToEdit.isLightning || false);
            } else {
                // ... existing fill logic
                setTitle('');
                setDescription('');
                setPriority('medium');
                setProjectId(activeProject || 'all');
                setDueDate(undefined);
                setRecurrence('none');
                setIsFrog(false);
                setShowMore(false);
            }
            setTimeout(() => titleInputRef.current?.focus(), 100);
        }
    }, [open, taskToEdit, activeProject]);


    // Parser Effect
    useEffect(() => {
        if (isEditMode) return;

        const timer = setTimeout(() => {
            if (!title.trim()) {
                setParsedData(null);
                return;
            }
            const result = parseTaskInput(title, projects);
            if (result.priority || result.dueDate || result.recurrence || result.projectId || result.duration) {
                setParsedData(result);
            } else {
                setParsedData(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [title, projects, isEditMode]);

    const resetForm = () => {
        if (!isEditMode) {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setRecurrence('none');
            setDueDate(undefined);
            setIsFrog(false);
            setIsLightning(false);
            setParsedData(null);
            setShowMore(false);
        }
    };

    const handleSubmit = (isDraft: boolean = false) => {
        if (!title.trim()) return;

        let finalTitle = title;
        let finalPriority = priority;
        let finalDueDate = dueDate?.getTime();
        let finalRecurrence: string | number = recurrence;
        let finalProjectId = projectId === 'all' ? undefined : projectId;

        let finalDuration: number | undefined = undefined;

        if (parsedData) {
            finalTitle = parsedData.title;
            if (priority === 'medium' && parsedData.priority) finalPriority = parsedData.priority;
            if (!dueDate && parsedData.dueDate) finalDueDate = parsedData.dueDate;
            if (recurrence === 'none' && parsedData.recurrence) finalRecurrence = parsedData.recurrence;
            if (projectId === 'all' && parsedData.projectId) finalProjectId = parsedData.projectId;
            if (parsedData.duration) finalDuration = parsedData.duration;
        }

        if (isEditMode && taskToEdit) {
            updateTask(taskToEdit.id, {
                title: finalTitle.trim(),
                description: description.trim() || undefined,
                priority: finalPriority,
                projectId: finalProjectId,
                dueDate: finalDueDate,
                recurrence: finalRecurrence === 'none' ? undefined : finalRecurrence as any,
                duration: finalDuration ? finalDuration : taskToEdit.duration,
                isLightning,
                isDraft
            });

            // Re-assert frog status if needed because toggleFrog handles mututally exclusive global state
            if (isFrog && !taskToEdit.isFrog) {
                useMonocleStore.getState().toggleFrog(taskToEdit.id);
            } else if (!isFrog && taskToEdit.isFrog) {
                useMonocleStore.getState().toggleFrog(taskToEdit.id); // Toggle off if it was
            }

            setOpen(false);
        } else {
            const taskId = generateId();
            const newTask: Task = {
                id: taskId,
                title: finalTitle.trim(),
                description: description.trim() || undefined,
                status: 'todo',
                priority: finalPriority,
                projectId: finalProjectId,
                dueDate: finalDueDate,
                recurrence: finalRecurrence === 'none' ? undefined : finalRecurrence as any,
                duration: finalDuration,
                isLightning,
                isDraft,
                createdAt: Date.now(),
            };
            addTask(newTask);

            if (isFrog) {
                useMonocleStore.getState().toggleFrog(taskId);
            }

            resetForm();
            if (!isControlled) {
                setTimeout(() => titleInputRef.current?.focus(), 0);
            } else {
                setOpen(false);
            }
        }
    };

    const handleBatchSubmit = (lines: string[], isDraft: boolean = false) => {
        let count = 0;
        let finalPriority = priority;
        let finalDueDate = dueDate?.getTime();
        let finalRecurrence: string | number = recurrence;
        let finalProjectId = projectId === 'all' ? undefined : projectId;

        // Note: For batch add, we DO NOT apply the smart parser to individual lines 
        // if we are explicitly carrying over metadata from the modal's current selected state.
        // Actually, it's safer to just run the parser on each line, and let the modal's state act as a fallback.

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const result = parseTaskInput(trimmed, projects);

            const taskId = generateId();
            const newTask: Task = {
                id: taskId,
                title: result.title.trim(),
                description: undefined,
                status: 'todo',
                priority: result.priority || finalPriority,
                projectId: result.projectId || finalProjectId,
                dueDate: result.dueDate || finalDueDate,
                recurrence: (result.recurrence || (finalRecurrence === 'none' ? undefined : finalRecurrence)) as any,
                duration: result.duration,
                isLightning,
                isDraft,
                createdAt: Date.now() + count,
            };
            addTask(newTask);

            if (isFrog && count === 0) {
                useMonocleStore.getState().toggleFrog(taskId);
            }
            count++;
        });

        setPendingPaste(null);
        resetForm();
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Mentions Navigation
        if (isMentionsOpen && mentionOptions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionSelectedIndex(prev => (prev + 1) % mentionOptions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionSelectedIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleMentionSelect(mentionOptions[mentionSelectedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                closeMentions();
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(false);
        } else if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            handleSubmit(true);
        }
    };

    const removeParsedProp = (prop: keyof ParsedTask) => {
        if (!parsedData) return;
        const newData = { ...parsedData };
        delete newData[prop];
        if (!newData.priority && !newData.dueDate && !newData.recurrence && !newData.projectId) {
            setParsedData(null);
        } else {
            setParsedData(newData);
        }
    };

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
            <DialogContent className="w-full sm:max-w-[600px] h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden bg-card/95 backdrop-blur-sm flex flex-col">

                <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0 text-center">
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setOpen(false)}>
                        <X className="h-4 w-4" />
                        <span className="text-sm font-medium">Close</span>
                    </div>
                    <DialogTitle className="text-sm font-semibold">
                        {isEditMode ? 'Edit' : 'New Task'}
                    </DialogTitle>
                    <div className="w-[60px]" />
                </DialogHeader>

                {/* Body - Scrollable */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">

                    {/* Project Selector */}
                    <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger className="w-fit h-auto p-0 border-none shadow-none text-muted-foreground hover:text-foreground focus:ring-0 text-xs font-medium bg-transparent">
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">No Project</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                        {p.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Task Title + Mentions */}
                    <div className="space-y-2 relative">
                        <Input
                            ref={titleInputRef}
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                onMentionChange();
                            }}
                            onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                                if (lines.length > 1) {
                                    e.preventDefault();
                                    setPendingPaste(lines);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Task Name"
                            className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto rounded-none"
                        />

                        {/* Mentions List */}
                        {isMentionsOpen && mentionOptions.length > 0 && (
                            <MentionsList
                                options={mentionOptions}
                                selectedIndex={mentionSelectedIndex}
                                onSelect={handleMentionSelect}
                                className="top-full left-0 mt-1 w-64 shadow-xl border-border/40"
                            />
                        )}

                        {/* Detection Chips */}
                        {parsedData && !isEditMode && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 transition-all flex-wrap">
                                {parsedData.priority && (
                                    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive border-dashed" onClick={() => removeParsedProp('priority')}>
                                        Priority: {parsedData.priority} <X className="h-3 w-3" />
                                    </Badge>
                                )}
                                {parsedData.dueDate && (
                                    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive border-dashed" onClick={() => removeParsedProp('dueDate')}>
                                        Due: {format(parsedData.dueDate, 'MMM d')} <X className="h-3 w-3" />
                                    </Badge>
                                )}
                                {parsedData.recurrence && (
                                    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive border-dashed" onClick={() => removeParsedProp('recurrence')}>
                                        Repeat: {parsedData.recurrence} <X className="h-3 w-3" />
                                    </Badge>
                                )}
                                {parsedData.projectId && (
                                    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive border-dashed" onClick={() => removeParsedProp('projectId')}>
                                        Project Detected <X className="h-3 w-3" />
                                    </Badge>
                                )}
                                {parsedData.duration && (
                                    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive border-dashed" onClick={() => removeParsedProp('duration' as any)}>
                                        Duration: {parsedData.duration}m <X className="h-3 w-3" />
                                    </Badge>
                                )}
                            </div>
                        )}
                        <div className="mt-1">
                            <Button variant="link" size="sm" className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowMore(!showMore)}>
                                {showMore ? 'Less Options' : 'More Options...'}
                            </Button>
                        </div>
                    </div>

                    {showMore && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Description */}
                            <div className="space-y-2 mb-3">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Description..."
                                    className="min-h-[60px] resize-none border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 text-sm rounded-none bg-transparent"
                                />
                            </div>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50 pt-3 mt-3">

                                {/* Priority */}
                                {!isFrog && (
                                    <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                        <SelectTrigger className="w-auto h-8 px-2 text-xs bg-muted/30 border-none shadow-sm hover:bg-muted/50">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}

                                {/* Due Date */}
                                {!isFrog && (
                                    <div className="flex items-center gap-1">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="secondary"
                                                    className={cn(
                                                        "w-auto h-8 px-2 justify-start text-left font-normal bg-muted/30 border-none shadow-sm hover:bg-muted/50 text-xs",
                                                        !dueDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {dueDate ? format(dueDate, "MM/dd") : <span>Date?</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={dueDate}
                                                    onSelect={setDueDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {dueDate && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => setDueDate(undefined)}
                                                title="Clear Date"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Recurring */}
                                <Select value={recurrence} onValueChange={setRecurrence}>
                                    <SelectTrigger className="w-auto h-8 px-2 text-xs bg-muted/30 border-none shadow-sm hover:bg-muted/50">
                                        <SelectValue placeholder="Recurring?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Repeat</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Frog Toggle */}
                                <Button
                                    type="button"
                                    variant={isFrog ? "default" : "secondary"}
                                    size="sm"
                                    className={cn(
                                        "w-auto h-8 px-2 text-xs border-none shadow-sm transition-all gap-1.5",
                                        isFrog ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 font-medium ring-1 ring-emerald-500/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                    )}
                                    onClick={() => setIsFrog(!isFrog)}
                                >
                                    <span className="text-sm leading-none">🐸</span>
                                    {isFrog ? 'Frog' : 'Make Frog'}
                                </Button>

                                {/* Lightning Toggle */}
                                <Button
                                    type="button"
                                    variant={isLightning ? "default" : "secondary"}
                                    size="sm"
                                    className={cn(
                                        "w-auto h-8 px-2 text-xs border-none shadow-sm transition-all gap-1.5",
                                        isLightning ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:hover:bg-yellow-500/30 font-medium ring-1 ring-yellow-500/30" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                    )}
                                    onClick={() => setIsLightning(!isLightning)}
                                >
                                    <span className="text-sm leading-none">⚡️</span>
                                    {isLightning ? 'Lightning' : 'Quick Win'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Helper - Sticky Bottom */}
                <div className="bg-muted/20 px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground shrink-0 pb-5 sm:pb-3 gap-3">
                    <div className="hidden sm:flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            {isEditMode ? 'Enter = save' : 'Enter = task, Shift+Enter = idea'}
                        </span>
                    </div>
                    {/* Explicit Add Button for mouse/mobile users */}
                    <div className="flex w-full sm:w-auto gap-2">
                        {!isEditMode && (
                            <Button variant="secondary" size="default" className="flex-1 sm:flex-none h-10 text-sm gap-2" onClick={() => handleSubmit(true)}>
                                <Lightbulb className="h-4 w-4" />
                                <span className="hidden sm:inline">Save as Idea</span>
                                <span className="sm:hidden">Idea</span>
                            </Button>
                        )}
                        <Button size="default" className="flex-1 sm:flex-none h-10 text-sm" onClick={() => handleSubmit(false)}>
                            {isEditMode ? 'Save Changes' : 'Add Task'}
                        </Button>
                    </div>
                </div>

            </DialogContent>

            {/* Render AlertDialog for Multi-line Paste outside DialogContent */}
            <AlertDialog open={!!pendingPaste} onOpenChange={(open) => !open && setPendingPaste(null)}>
                <AlertDialogContent className="z-[100]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create {pendingPaste?.length} items?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You pasted multiple lines. Do you want to create a separate task for each line?
                            <br /><br />
                            <span className="font-semibold text-foreground">Note:</span> Your currently selected project, priority, and tags will be applied to all of them.
                            {isFrog && (
                                <><br /><br /><span className="text-emerald-500 font-medium text-xs">The Daily Frog will only be applied to the first task in the list.</span></>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground border p-2 rounded-md bg-muted/30">
                        {pendingPaste?.slice(0, 5).map((line, i) => (
                            <div key={i} className="truncate">• {line}</div>
                        ))}
                        {(pendingPaste?.length || 0) > 5 && (
                            <div className="text-xs italic mt-1 font-medium">...and {(pendingPaste?.length || 0) - 5} more</div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingPaste(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (pendingPaste) {
                                handleBatchSubmit(pendingPaste, false);
                            }
                        }}>
                            Create Tasks
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
