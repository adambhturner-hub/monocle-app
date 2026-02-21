'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { parseTaskInput, ParsedTask } from '@/lib/smart-parser';
import { generateId } from '@/lib/utils';
import { Task } from '@/types';
import TextareaAutosize from 'react-textarea-autosize';
import { SwipeableTask } from './ui/swipeable-task';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar as CalendarIcon, AlertCircle, Repeat, Plus, Zap, ArrowRight, ListTodo } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from './mentions-list';
import { toast } from 'sonner';

export function CaptureView() {
    const { addTask, projects, setView } = useMonocleStore();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [projectId, setProjectId] = useState<string>('all');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [recurrence, setRecurrence] = useState<string>('none');

    const [parsedData, setParsedData] = useState<ParsedTask | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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

    // Auto-focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Parser
    useEffect(() => {
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
    }, [title, projects]);

    const submitTask = (destination: 'capture' | 'queue' | 'focus') => {
        if (!title.trim()) return;

        let finalTitle = title;
        let finalPriority = priority;
        let finalDueDate = dueDate?.getTime();
        let finalRecurrence: string | number = recurrence;
        let finalProjectId = projectId === 'all' ? undefined : projectId;

        if (parsedData) {
            finalTitle = parsedData.title;
            if (priority === 'medium' && parsedData.priority) finalPriority = parsedData.priority;
            if (!dueDate && parsedData.dueDate) finalDueDate = parsedData.dueDate;
            if (recurrence === 'none' && parsedData.recurrence) finalRecurrence = parsedData.recurrence;
            if (projectId === 'all' && parsedData.projectId) finalProjectId = parsedData.projectId;
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
            isDraft: destination === 'queue' ? false : true, // Only fully promote if dropped into Queue or Focus explicitly? Actually, let's say all capture is real queue unless tagged otherwise. We'll make it false.
            createdAt: Date.now(),
        };

        addTask(newTask);
        toast.success("Captured");

        // Reset
        setTitle('');
        setDescription('');
        setPriority('medium');
        setRecurrence('none');
        setDueDate(undefined);
        setParsedData(null);

        if (destination === 'queue') {
            setView('queue');
        } else if (destination === 'focus') {
            setView('focus');
        } else {
            // Stay on capture, refocus
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    };

    // A dummy task object just to feed the SwipeableTask interface (it expects a task to render)
    // Since we aren't executing a task, we just need the gesture shell.
    const dummyTask = { id: 'capture_modal', title: 'Capture' } as Task;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (isMentionsOpen && mentionOptions.length > 0) {
                e.preventDefault();
                handleMentionSelect(mentionOptions[mentionSelectedIndex]);
                return;
            }
            e.preventDefault();
            // Default Enter behavior: Submit and stay in Capture
            submitTask('capture');
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

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-300 px-4 h-full">
            <SwipeableTask
                task={dummyTask}
                isMobile={true} // Enable swipes everywhere for capture
                leftAction={() => submitTask('focus')}
                rightAction={() => submitTask('capture')}
                downAction={() => submitTask('queue')}
                leftIcon={Zap}
                leftLabel="Execute"
                leftBgClass="bg-purple-500"
                leftColorClass="text-purple-600"
                rightIcon={Plus}
                rightLabel="Add"
                rightBgClass="bg-emerald-500"
                rightColorClass="text-emerald-600"
            >
                <Card className="w-full max-w-2xl h-[calc(100vh-10rem)] md:h-[600px] shadow-2xl border bg-card/95 backdrop-blur-xl relative flex flex-col items-center justify-center text-center rounded-[2rem] group transition-all duration-500 overflow-hidden ring-1 ring-white/5">

                    {/* The Giant Input Field */}
                    <div className="w-full px-8 md:px-16 flex flex-col items-center justify-center relative">
                        <TextareaAutosize
                            ref={inputRef}
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                onMentionChange();
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="What's on your mind?"
                            className="w-full bg-transparent border-none text-3xl md:text-5xl font-bold text-center resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 leading-tight"
                            minRows={1}
                            maxRows={5}
                            autoFocus
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
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50">
                                <MentionsList
                                    options={mentionOptions}
                                    selectedIndex={mentionSelectedIndex}
                                    onSelect={handleMentionSelect}
                                />
                            </div>
                        )}
                    </div>

                    {/* Metadata Rack (Bottom Toolbar) */}
                    <div className="absolute bottom-6 w-full px-6 flex flex-col gap-6">

                        {/* Manual Overrides */}
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {/* Priority */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-secondary/50 hover:bg-secondary",
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

                            {/* Date */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={cn(
                                        "px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-secondary/50 hover:bg-secondary",
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
                        </div>

                        {/* Physical Action Buttons */}
                        <div className="flex justify-center gap-3 w-full max-w-sm mx-auto">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-full h-12 bg-secondary/30 hover:bg-secondary border-white/5 data-[disabled]:opacity-50"
                                onClick={() => submitTask('focus')}
                                disabled={!title.trim()}
                            >
                                <Zap className="w-4 h-4 mr-2" /> Focus
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 rounded-full h-12 bg-secondary/30 hover:bg-secondary border-white/5 data-[disabled]:opacity-50"
                                onClick={() => submitTask('queue')}
                                disabled={!title.trim()}
                            >
                                <ListTodo className="w-4 h-4 mr-2" /> Queue
                            </Button>
                            <Button
                                variant="default"
                                className="flex-1 rounded-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white data-[disabled]:opacity-50"
                                onClick={() => submitTask('capture')}
                                disabled={!title.trim()}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add
                            </Button>
                        </div>
                    </div>

                </Card>
            </SwipeableTask>
        </div>
    );
}
