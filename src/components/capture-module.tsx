'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { parseTaskInput, ParsedTask } from '@/lib/smart-parser';
import { generateId } from '@/lib/utils';
import { Task } from '@/types';
import TextareaAutosize from 'react-textarea-autosize';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar as CalendarIcon, AlertCircle, Repeat, Plus, Target, Layers, Lightbulb, ChevronDown, ChevronUp, Folder, Save } from 'lucide-react';
import { SwipeableTask } from './ui/swipeable-task';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icons';
import { Textarea } from './ui/textarea';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from './mentions-list';
import { toast } from 'sonner';

export interface CaptureModuleProps {
    taskToEdit?: Task;
    onComplete?: () => void;
    isModal?: boolean;
}

export function CaptureModule({ taskToEdit, onComplete, isModal = false }: CaptureModuleProps) {
    const { addTask, updateTask, projects, setView, deleteTask, draftTaskData, setDraftTaskData, activeProject, setActiveModal } = useMonocleStore();

    const isEditMode = !!taskToEdit;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [projectId, setProjectId] = useState<string>('all');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [recurrence, setRecurrence] = useState<string>('none');

    const [parsedData, setParsedData] = useState<ParsedTask | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [isFrog, setIsFrog] = useState(false);
    const [isLightning, setIsLightning] = useState(false);

    // Initializer for Edit Mode or Undo Drafts
    useEffect(() => {
        setParsedData(null);
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setPriority(taskToEdit.priority);
            setProjectId(taskToEdit.projectId || 'all');
            setDueDate(taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined);
            setRecurrence(taskToEdit.recurrence?.toString() || 'none');
            setIsFrog(taskToEdit.isFrog || false);
            setIsLightning(taskToEdit.isLightning || false);
            if (taskToEdit.description || taskToEdit.recurrence || taskToEdit.dueDate) {
                setAdvancedOpen(true);
            }
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setProjectId(activeProject || 'all');
            setDueDate(undefined);
            setRecurrence('none');
            setIsFrog(false);
            setAdvancedOpen(false);

            if (draftTaskData) {
                setTitle(draftTaskData.title || '');
                setDescription(draftTaskData.description || '');
                setPriority(draftTaskData.priority || 'medium');
                setProjectId(draftTaskData.projectId || activeProject || 'all');
                if (draftTaskData.dueDate) setDueDate(new Date(draftTaskData.dueDate));
                setRecurrence(draftTaskData.recurrence?.toString() || 'none');
                setIsFrog(draftTaskData.isFrog || false);
                setIsLightning(draftTaskData.isLightning || false);
                if (draftTaskData.description || draftTaskData.recurrence || draftTaskData.dueDate) {
                    setAdvancedOpen(true);
                }
                setDraftTaskData(null);
            }
        }
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [taskToEdit, activeProject, draftTaskData]);

    // Mentions
    const { activeTrigger, filterText, isOpen: isMentionsOpen, onInputChange: onMentionChange, triggerIndex, closeMentions } = useMentions({ inputRef: inputRef as any });
    const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

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
                { label: 'low', value: 'low', icon: <AlertCircle className="w-3 h-3 text-blue-500" /> }
            ];
            return priorities.filter(p => p.label.includes(lowerFilter));
        }
        return [];
    }, [activeTrigger, filterText, projects]);

    useEffect(() => {
        setMentionSelectedIndex(0);
    }, [mentionOptions.length, activeTrigger]);

    const handleMentionSelect = (option: MentionOption) => {
        const input = inputRef.current;
        if (!input || !activeTrigger) return;

        const text = input.value;
        const before = text.slice(0, triggerIndex);
        const after = text.slice(triggerIndex + 1 + filterText.length);
        const insertion = activeTrigger + option.label + ' ';
        const newValue = before + insertion + after;

        setTitle(newValue);

        setTimeout(() => {
            input.focus();
            const newCursorPos = before.length + insertion.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);

        closeMentions();
    };

    // Parser
    useEffect(() => {
        if (isEditMode) return;
        const timer = setTimeout(() => {
            if (!title.trim()) {
                setParsedData(null);
                return;
            }
            const result = parseTaskInput(title, projects);
            if (result.priority || result.dueDate || result.recurrence || result.projectId) {
                setParsedData(result);
            } else {
                setParsedData(null);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [title, projects, isEditMode]);

    const submitTask = (destination: 'capture' | 'queue' | 'focus' | 'idea' | 'save' | 'archive') => {
        if (!title.trim()) {
            if (destination === 'queue') setView('queue');
            if (destination === 'focus') setView('focus');
            if (destination === 'idea') setView('ideas');
            if (onComplete) onComplete();
            return;
        }

        let finalTitle = title;
        let finalPriority = priority;
        let finalDueDate = dueDate?.getTime();
        let finalRecurrence: string | number = recurrence;
        let finalProjectId = projectId === 'all' ? undefined : projectId;

        if (parsedData && !isEditMode) {
            finalTitle = parsedData.title;
            if (priority === 'medium' && parsedData.priority) finalPriority = parsedData.priority;
            if (!dueDate && parsedData.dueDate) finalDueDate = parsedData.dueDate;
            if (recurrence === 'none' && parsedData.recurrence) finalRecurrence = parsedData.recurrence;
            if (projectId === 'all' && parsedData.projectId) finalProjectId = parsedData.projectId;
        }

        if (isEditMode && taskToEdit) {
            updateTask(taskToEdit.id, {
                title: finalTitle.trim(),
                description: description.trim() || undefined,
                priority: finalPriority,
                projectId: finalProjectId,
                dueDate: finalDueDate,
                recurrence: (finalRecurrence === 'none' ? undefined : finalRecurrence) as any,
                isLightning,
                isFrog: isFrog,
                isDraft: destination === 'queue' || destination === 'focus' ? false : taskToEdit.isDraft,
                status: destination === 'archive' ? 'done' : taskToEdit.status,
            });
            if (isFrog && !taskToEdit.isFrog) {
                useMonocleStore.getState().toggleFrog(taskToEdit.id);
            } else if (!isFrog && taskToEdit.isFrog) {
                useMonocleStore.getState().toggleFrog(taskToEdit.id);
            }

            if (destination === 'archive') {
                toast.success("Archived");
            } else if (destination === 'queue') {
                toast.success("Moved to Queue");
            }

            if (onComplete) onComplete();
            return;
        }

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
            isDraft: destination === 'idea' ? true : false,
            isFrog: isFrog,
            isLightning: isLightning,
            createdAt: Date.now(),
        };

        addTask(newTask);

        if (isFrog) {
            useMonocleStore.getState().toggleFrog(taskId);
        }

        toast.success(destination === 'idea' ? "Idea added" : "Captured", {
            action: {
                label: "Undo",
                onClick: () => {
                    deleteTask(taskId);
                    setDraftTaskData({
                        title: title,
                        description: description,
                        priority: priority,
                        projectId: projectId === 'all' ? undefined : projectId,
                        dueDate: dueDate?.getTime(),
                        recurrence: recurrence === 'none' ? undefined : recurrence as any,
                        isFrog: isFrog,
                        isLightning: isLightning
                    });
                    setActiveModal('add-task');
                }
            }
        });

        // Reset if we are staying
        setTitle('');
        setDescription('');
        setPriority('medium');
        setRecurrence('none');
        setDueDate(undefined);
        setParsedData(null);
        setIsFrog(false);
        setIsLightning(false);
        setAdvancedOpen(false);

        if (destination === 'queue') {
            setView('queue');
        } else if (destination === 'focus') {
            setView('focus');
        } else {
            setTimeout(() => inputRef.current?.focus(), 10);
        }

        if (onComplete) onComplete();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (isMentionsOpen && mentionOptions.length > 0) {
                e.preventDefault();
                handleMentionSelect(mentionOptions[mentionSelectedIndex]);
                return;
            }
            e.preventDefault();
            submitTask(isEditMode ? 'save' : 'capture');
        }

        if (isMentionsOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionSelectedIndex(prev => (prev + 1) % mentionOptions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionSelectedIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
            } else if (e.key === 'Escape') {
                closeMentions();
            }
        }
    };

    const innerContent = (
        <>
            <div className="w-full px-8 md:px-16 flex flex-col items-center justify-center relative flex-1 min-h-[50vh]">
                <div className={cn("mb-6 animate-in fade-in slide-in-from-top-4 duration-500", isModal && "mt-12")}>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="w-fit inline-flex justify-center h-9 px-4 rounded-full border border-border/50 text-xs font-semibold flex items-center gap-2 transition-all bg-secondary/50 hover:bg-secondary text-muted-foreground focus:ring-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                {(() => {
                                    if (projectId === 'all') {
                                        return <><Folder className="h-4 w-4 shrink-0 opacity-60" /> <span className="truncate max-w-[120px]">Project</span></>;
                                    }
                                    const proj = projects.find(p => p.id === projectId);
                                    if (!proj) return <><Folder className="h-4 w-4 shrink-0 opacity-60" /> <span className="truncate max-w-[120px]">Project</span></>;
                                    const IconCmp = getIconComponent(proj.icon);
                                    return (
                                        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
                                            <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: proj.color }}>
                                                <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />
                                            </div>
                                            <span className="truncate max-w-[120px] text-foreground">{proj.name}</span>
                                        </div>
                                    );
                                })()}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="center" className="w-56 p-1 z-[100]">
                            <div className="text-[10px] font-bold px-2 py-1.5 text-muted-foreground uppercase tracking-widest mb-1">
                                Assign Project
                            </div>
                            <button
                                onClick={() => setProjectId('all')}
                                className={cn(
                                    "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors",
                                    projectId === 'all' && "bg-secondary text-primary font-medium"
                                )}
                            >
                                <Folder className="h-4 w-4 text-muted-foreground opacity-60" />
                                No Project
                            </button>
                            {projects.map(p => {
                                const IconCmp = getIconComponent(p.icon);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setProjectId(p.id)}
                                        className={cn(
                                            "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors",
                                            projectId === p.id && "bg-secondary text-primary font-medium"
                                        )}
                                    >
                                        <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: p.color }}>
                                            <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />
                                        </div>
                                        <span className="truncate">{p.name}</span>
                                    </button>
                                );
                            })}
                        </PopoverContent>
                    </Popover>
                </div>

                <TextareaAutosize
                    ref={inputRef}
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        onMentionChange();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="What's on your mind?"
                    className={cn(
                        "w-full bg-transparent border-none text-center resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 leading-tight",
                        isModal ? "text-2xl md:text-3xl font-bold" : "text-3xl md:text-5xl font-bold"
                    )}
                    minRows={1}
                    maxRows={5}
                    maxLength={120}
                />

                {/* NLP Highlights display */}
                {(parsedData?.dueDate || parsedData?.priority || parsedData?.projectId || parsedData?.recurrence) && (
                    <div className="absolute -bottom-12 flex items-center justify-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-4">
                        {parsedData.dueDate && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center gap-1.5 backdrop-blur-md">
                                <CalendarIcon className="w-3 h-3" /> {format(parsedData.dueDate, 'MMM d')}
                            </span>
                        )}
                        {parsedData.priority && parsedData.priority !== 'medium' && (
                            <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md",
                                parsedData.priority === 'high' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                            )}>
                                <AlertCircle className="w-3 h-3" /> {parsedData.priority}
                            </span>
                        )}
                        {parsedData.recurrence && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-500 flex items-center gap-1.5 backdrop-blur-md">
                                <Repeat className="w-3 h-3" /> {parsedData.recurrence}
                            </span>
                        )}
                    </div>
                )}

                {isMentionsOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-[100]">
                        <MentionsList
                            options={mentionOptions}
                            selectedIndex={mentionSelectedIndex}
                            onSelect={handleMentionSelect}
                        />
                    </div>
                )}
            </div>

            <div className={cn("w-full px-6 flex flex-col gap-4 z-10", isModal ? "pb-0 shrink-0" : "mt-auto pb-6")}>
                <div className="flex justify-center">
                    <button
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors bg-secondary/30 px-3 py-1.5 rounded-full"
                    >
                        {advancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {advancedOpen ? "Hide Options" : "Advanced Options"}
                    </button>
                </div>

                {advancedOpen && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 w-full max-w-sm mx-auto">
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details, notes, or links..."
                            className="min-h-[60px] resize-none text-sm bg-card hover:bg-secondary/50 focus:bg-secondary transition-colors border-border/50 rounded-xl px-3 py-2"
                        />

                        <div className="flex flex-wrap justify-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-card hover:bg-secondary",
                                        priority === 'high' ? "text-amber-500 border-amber-500/30" :
                                            priority === 'low' ? "text-blue-500 border-blue-500/30" : "text-muted-foreground border-border/50"
                                    )}>
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                    <DropdownMenuRadioGroup value={priority} onValueChange={(v: any) => setPriority(v as any)}>
                                        <DropdownMenuRadioItem value="low" className="text-blue-500">Low</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="high" className="text-amber-500">High</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={cn(
                                        "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-card hover:bg-secondary",
                                        dueDate ? "text-indigo-500 border-indigo-500/30" : "text-muted-foreground border-border/50"
                                    )}>
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        {dueDate ? format(dueDate, 'MMM d') : 'Date'}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <CalendarComponent
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={(d: any) => setDueDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <Select value={recurrence} onValueChange={setRecurrence}>
                                <SelectTrigger className="flex-1 justify-center h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-card hover:bg-secondary border-border/50 text-muted-foreground focus:ring-0">
                                    <Repeat className="h-3.5 w-3.5 shrink-0" />
                                    <SelectValue placeholder="Repeat" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Repeat</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>

                            <button
                                onClick={() => { setIsFrog(!isFrog); setIsLightning(false); }}
                                className={cn(
                                    "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center transition-all bg-card whitespace-nowrap",
                                    isFrog ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "hover:bg-secondary text-muted-foreground border-border/50"
                                )}
                            >
                                <span className="text-sm leading-none mr-1.5">🐸</span> Frog
                            </button>

                            <button
                                onClick={() => { setIsLightning(!isLightning); setIsFrog(false); }}
                                className={cn(
                                    "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center transition-all bg-card whitespace-nowrap",
                                    isLightning ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : "hover:bg-secondary text-muted-foreground border-border/50"
                                )}
                            >
                                <span className="text-sm leading-none mr-1.5">⚡️</span> Quick
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                    {isEditMode ? (
                        <div className="flex flex-col gap-2">
                            {taskToEdit?.isDraft && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="flex-1 rounded-full h-11 bg-secondary/30 hover:bg-secondary border-border/50 text-xs font-medium"
                                        onClick={() => submitTask('queue')}
                                    >
                                        <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> To Queue
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="flex-1 rounded-full h-11 bg-secondary/30 hover:bg-secondary border-border/50 text-xs font-medium text-destructive hover:text-destructive"
                                        onClick={() => submitTask('archive')}
                                    >
                                        <Folder className="w-3.5 h-3.5 mr-1.5" /> Archive
                                    </Button>
                                </div>
                            )}
                            <Button
                                variant="default"
                                size="lg"
                                className="w-full rounded-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-md active:scale-95 transition-transform"
                                onClick={() => submitTask('save')}
                            >
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    ) : (
                        <>
                            {!isModal && (
                                <div className="flex justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-full bg-secondary/30 hover:bg-secondary border-border/50 data-[disabled]:opacity-50 h-9 font-medium text-xs"
                                        onClick={() => submitTask('idea')}
                                    >
                                        <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-yellow-500" /> Idea
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-full bg-secondary/30 hover:bg-secondary border-border/50 data-[disabled]:opacity-50 h-9 font-medium text-xs"
                                        onClick={() => submitTask('queue')}
                                    >
                                        <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Prioritize
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-full bg-secondary/30 hover:bg-secondary border-border/50 data-[disabled]:opacity-50 h-9 font-medium text-xs"
                                        onClick={() => submitTask('focus')}
                                    >
                                        <Target className="w-3.5 h-3.5 mr-1.5 text-red-500" /> Focus
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="default"
                                size="lg"
                                className="w-full rounded-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-md active:scale-95 transition-transform"
                                onClick={() => submitTask('capture')}
                            >
                                <Plus className="w-4 h-4 mr-2" /> {isModal ? "Add Task" : "Add Task"}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </>
    );

    if (isModal) {
        return (
            <div className="flex flex-col items-center justify-between h-full bg-card relative rounded-[2rem] overflow-x-hidden overflow-y-auto w-full pb-6">
                {innerContent}
            </div>
        );
    }

    const dummyTask = { id: 'capture_modal', title: 'Capture' } as Task;

    return (
        <SwipeableTask
            task={dummyTask}
            isMobile={true}
            leftAction={() => submitTask('idea')}
            leftIcon={Lightbulb}
            leftLabel="Idea Dump"
            leftBgClass="bg-yellow-500"
            leftColorClass="text-yellow-600"
            rightAction={() => submitTask('focus')}
            rightIcon={Target}
            rightLabel="Focus"
            rightBgClass="bg-red-500"
            rightColorClass="text-red-600"
            downAction={() => submitTask('queue')}
            downIcon={Layers}
            downLabel="Queue"
            downBgClass="bg-blue-500"
            downColorClass="text-blue-600"
            upAction={() => submitTask('capture')}
            upIcon={Plus}
            upLabel="Add Task"
            upBgClass="bg-indigo-500"
            upColorClass="text-indigo-600"
        >
            <Card className="w-full max-w-2xl h-[calc(100vh-10rem)] md:h-[600px] shadow-2xl border bg-card/95 backdrop-blur-xl relative flex flex-col items-center justify-center text-center rounded-[2rem] group transition-all duration-500 overflow-hidden ring-1 ring-white/5">
                {innerContent}
            </Card>
        </SwipeableTask>
    );
}
