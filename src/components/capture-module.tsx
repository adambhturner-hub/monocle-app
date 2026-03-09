'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { parseTaskInput, ParsedTask } from '@/lib/smart-parser';
import { generateId } from '@/lib/utils';
import { Task } from '@/types';
import TextareaAutosize from 'react-textarea-autosize';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar as CalendarIcon, AlertCircle, Repeat, Plus, Target, Layers, Lightbulb, ChevronDown, ChevronUp, Folder, Save, Zap, Hourglass } from 'lucide-react';
import { SwipeableTask } from './ui/swipeable-task';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getIconComponent, PROJECT_ICONS } from '@/lib/icons';
import { Textarea } from './ui/textarea';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from './mentions-list';
import { toast } from 'sonner';

import { ParsedToken } from '@/lib/smart-parser';

const renderHighlightedText = (text: string, matchedTokens: ParsedToken[]) => {
    if (!text || !matchedTokens || matchedTokens.length === 0) return <span>{text}</span>;

    const sortedTokens = [...matchedTokens].sort((a, b) => b.text.length - a.text.length);
    const escapedTokens = sortedTokens.map(token => token.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    const parts = text.split(regex);

    return parts.map((part, i) => {
        const tokenMatch = sortedTokens.find(token => part.toLowerCase() === token.text.toLowerCase());

        if (tokenMatch) {
            let colorClass = "bg-primary/20 text-transparent";
            switch (tokenMatch.type) {
                case 'frog': colorClass = "bg-green-500/20 text-transparent"; break;
                case 'lightning': colorClass = "bg-amber-500/20 text-transparent"; break;
                case 'date': colorClass = "bg-purple-500/20 text-transparent"; break;
                case 'priority': colorClass = "bg-red-500/20 text-transparent"; break;
                case 'recurrence': colorClass = "bg-blue-500/20 text-transparent"; break;
                case 'duration': colorClass = "bg-slate-500/30 text-transparent"; break;
                case 'project': colorClass = "bg-primary/20 text-transparent"; break;
            }

            return (
                <span key={i} className={cn(colorClass, "rounded-sm transition-colors duration-200")} style={tokenMatch.type === 'project' && tokenMatch.color ? { backgroundColor: `${tokenMatch.color}33` } : undefined}>
                    {part}
                </span>
            );
        }
        return <span key={i} className="text-transparent">{part}</span>;
    });
};

const COLORS = [
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#eab308', // Yellow 500
    '#22c55e', // Green 500
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500
    '#8b5cf6', // Violet 500
    '#d946ef', // Fuchsia 500
    '#64748b', // Slate 500
];

export interface CaptureModuleProps {
    taskToEdit?: Task;
    onComplete?: () => void;
    isModal?: boolean;
}

export function CaptureModule({ taskToEdit, onComplete, isModal = false }: CaptureModuleProps) {
    const { addTask, updateTask, updateProject, projects, setView, deleteTask, draftTaskData, setDraftTaskData, activeProject, setActiveModal } = useMonocleStore();

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

        if (activeTrigger === '#') {
            const matches = projects
                .filter(p => p.name.toLowerCase().includes(lowerFilter))
                .slice(0, 5)
                .map(p => ({
                    label: p.name,
                    value: p.id,
                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                }));

            // Check if exact match exists
            const exactMatch = projects.find(p => p.name.toLowerCase() === lowerFilter);
            if (lowerFilter.length > 0 && !exactMatch) {
                // Add a "create new" option
                matches.push({
                    label: `Create "${filterText}"...`,
                    value: `create_${filterText}`,
                    icon: <Plus className="w-3 h-3 text-muted-foreground" />
                });
            }

            return matches;
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

        if (activeTrigger === '#') {
            const isCreatingNew = option.value.startsWith('create_');
            if (isCreatingNew) {
                const newProjectName = option.value.replace('create_', '');
                const newProjectId = generateId();
                useMonocleStore.getState().addProject({
                    id: newProjectId,
                    name: newProjectName,
                    color: '#6366f1', // Default indigo
                    icon: 'Folder'
                });
                setProjectId(newProjectId);
                toast.success(`Created project "${newProjectName}"`);
            } else {
                setProjectId(option.value);
            }

            // Replace the hashtag string with nothing to strip it out
            const newValue = before + after;
            setTitle(newValue);

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(before.length, before.length);
            }, 0);
        } else {
            const insertion = activeTrigger + option.label + ' ';
            const newValue = before + insertion + after;
            setTitle(newValue);

            setTimeout(() => {
                input.focus();
                const newCursorPos = before.length + insertion.length;
                input.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }

        closeMentions();
    };

    // Parser
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!title.trim()) {
                setParsedData(null);
                return;
            }
            const result = parseTaskInput(title, projects);
            if (result.priority || result.dueDate || result.recurrence || result.projectId || result.isFrog || result.isLightning) {
                setParsedData(result);
            } else {
                setParsedData(null);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [title, projects]);

    const submitTask = (destination: 'capture' | 'queue' | 'focus' | 'idea' | 'save' | 'archive') => {
        const finalTitle = title.replace(/\u200B/g, '').trim();
        if (!finalTitle) {
            toast.error("Task title cannot be empty");
            if (destination === 'queue') setView('queue');
            if (destination === 'focus') setView('focus');
            if (destination === 'idea') setView('ideas');
            if (onComplete) onComplete();
            return;
        }

        let finalPriority = priority;
        let finalDueDate = dueDate?.getTime();
        let finalRecurrence: string | number = recurrence;
        let finalProjectId = projectId === 'all' ? undefined : projectId;
        let finalIsFrog = isFrog;
        let finalIsLightning = isLightning;

        if (parsedData) {
            // The parsedData.title here is already stripped of tokens, but we use finalTitle for the actual task title.
            // We still use parsedData to extract the *values* of the tokens.

            // In Edit mode, we still want to apply parsed tokens.
            // However, we only override state values if the user hasn't actively fought the parser.
            // The simplest approach is to always let parsed tokens win if they exist in the current string.
            if (parsedData.priority) finalPriority = parsedData.priority;
            if (parsedData.dueDate) finalDueDate = parsedData.dueDate;
            if (parsedData.recurrence) finalRecurrence = parsedData.recurrence;
            if (parsedData.projectId) finalProjectId = parsedData.projectId;

            // Auto-apply Frog and Lightning tags if they typed it
            if (parsedData.isFrog) finalIsFrog = true;
            if (parsedData.isLightning) finalIsLightning = true;
        }

        if (isEditMode && taskToEdit) {
            updateTask(taskToEdit.id, {
                title: finalTitle,
                description: description.trim() || undefined,
                priority: finalPriority,
                projectId: finalProjectId,
                dueDate: finalDueDate,
                recurrence: (finalRecurrence === 'none' ? undefined : finalRecurrence) as any,
                isLightning: finalIsLightning,
                isFrog: finalIsFrog,
                isDraft: destination === 'queue' || destination === 'focus' ? false : taskToEdit.isDraft,
                status: destination === 'archive' ? 'done' : (parsedData?.isWaiting ? 'waiting' : taskToEdit.status),
            });

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
            title: finalTitle,
            description: description.trim() || undefined,
            status: parsedData?.isWaiting ? 'waiting' : 'todo',
            priority: finalPriority,
            projectId: finalProjectId,
            dueDate: finalDueDate,
            recurrence: finalRecurrence === 'none' ? undefined : finalRecurrence as any,
            isDraft: destination === 'idea' ? true : false,
            isFrog: false, // Will be made true securely by toggleFrog if requested
            isLightning: finalIsLightning,
            createdAt: Date.now(),
        };

        addTask(newTask);

        if (finalIsFrog) {
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
        if (e.key === 'Backspace' && inputRef.current && parsedData?.matchedTokens) {
            const cursorPosition = inputRef.current.selectionStart;
            const textBeforeCursor = title.substring(0, cursorPosition);

            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            for (const token of parsedData.matchedTokens) {
                // Must be at exactly the end of the token
                const regex = new RegExp(escapeRegExp(token.text) + "$", "i");
                if (regex.test(textBeforeCursor)) {
                    e.preventDefault();

                    const match = textBeforeCursor.match(regex)!;
                    const tokenTextPos = textBeforeCursor.lastIndexOf(match[0]);
                    const beforeToken = title.substring(0, tokenTextPos);
                    const tokenText = match[0];

                    // Insert \u200B right before the last character of the token to break the match
                    const modifiedToken = tokenText.substring(0, tokenText.length - 1) + '\u200B' + tokenText.substring(tokenText.length - 1);
                    const afterToken = title.substring(cursorPosition);

                    setTitle(beforeToken + modifiedToken + afterToken);

                    // Keep cursor at the same visual position
                    setTimeout(() => {
                        const newPos = cursorPosition + 1; // Since we added 1 invisible char before cursor
                        inputRef.current?.setSelectionRange(newPos, newPos);
                    }, 0);

                    return;
                }
            }
        }

        if (e.key === ' ' && isMentionsOpen && activeTrigger === '#') {
            if (mentionOptions.length > 0) {
                const selected = mentionOptions[mentionSelectedIndex];
                if (!selected.value.startsWith('create_')) {
                    e.preventDefault();
                    handleMentionSelect(selected);
                    return;
                } else {
                    closeMentions();
                    // Let space behave normally
                }
            }
        }

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
            <div className="w-full px-8 md:px-16 flex flex-col items-center justify-center relative flex-1 py-6">
                <div className={cn("mb-6 animate-in fade-in slide-in-from-top-4 duration-500", isModal && "mt-12")}>
                    {(() => {
                        const isAll = projectId === 'all';
                        const proj = !isAll ? projects.find(p => p.id === projectId) : null;

                        return (
                            <div className="flex items-center bg-secondary/50 rounded-full border border-border/50 shadow-sm h-9 hover:bg-secondary transition-all w-fit">
                                {!isAll && proj && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="h-full pl-3 pr-2 flex items-center justify-center rounded-l-full hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: proj.color }}>
                                                    {(() => {
                                                        const IconCmp = getIconComponent(proj.icon);
                                                        return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                                    })()}
                                                </div>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-64 p-3 z-[100] flex flex-col gap-3">
                                            <div className="flex items-center justify-between pb-2 border-b">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Edit Project</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Color</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            className={cn("w-5 h-5 rounded-full hover:scale-110 transition-transform", proj.color === c && "ring-2 ring-offset-2 ring-primary")}
                                                            style={{ backgroundColor: c }}
                                                            onClick={async () => {
                                                                updateProject(proj.id, { color: c });
                                                                setTimeout(() => inputRef.current?.focus(), 10);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Icon</p>
                                                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 scrollbar-none">
                                                    {Object.keys(PROJECT_ICONS).map(iconName => {
                                                        const IconCmp = PROJECT_ICONS[iconName as keyof typeof PROJECT_ICONS];
                                                        return (
                                                            <button
                                                                key={iconName}
                                                                className={cn("w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors", proj.icon === iconName && "bg-secondary text-primary ring-1 ring-primary")}
                                                                onClick={async () => {
                                                                    updateProject(proj.id, { icon: iconName });
                                                                    setTimeout(() => inputRef.current?.focus(), 10);
                                                                }}
                                                            >
                                                                <IconCmp className="h-3.5 w-3.5" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className={cn(
                                            "h-full text-xs font-semibold flex items-center gap-2 text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            !isAll && proj ? "pr-4 pl-1 rounded-r-full" : "px-4 rounded-full"
                                        )}>
                                            {isAll || !proj ? (
                                                <><Folder className="h-4 w-4 shrink-0 opacity-60" /> <span className="truncate max-w-[120px]">Project</span></>
                                            ) : (
                                                <span className="truncate max-w-[120px] text-foreground hover:text-primary transition-colors">{proj.name}</span>
                                            )}
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
                        );
                    })()}
                </div>

                <div className="relative w-full">
                    {/* Syntax Highlighting Background Overlay */}
                    <div
                        className={cn(
                            "absolute inset-0 pointer-events-none w-full bg-transparent text-center p-0 m-0 resize-none focus:outline-none placeholder-transparent leading-tight break-words whitespace-pre-wrap text-transparent",
                            isModal ? "text-2xl md:text-3xl font-bold" : "text-3xl md:text-5xl font-bold"
                        )}
                        aria-hidden="true"
                    >
                        {renderHighlightedText(title, parsedData?.matchedTokens || [])}
                    </div>

                    <TextareaAutosize
                        ref={(node) => {
                            if (node) inputRef.current = node;
                        }}
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            onMentionChange();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="What's on your mind?"
                        className={cn(
                            "w-full bg-transparent border-none text-center p-0 m-0 resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 leading-tight text-foreground caret-foreground relative z-10",
                            isModal ? "text-2xl md:text-3xl font-bold" : "text-3xl md:text-5xl font-bold"
                        )}
                        minRows={1}
                        maxRows={5}
                        maxLength={255}
                    />
                </div>



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

            <div className={cn("w-full px-6 flex flex-col gap-4 z-10 shrink-0", isModal ? "pb-6 pt-0" : "mt-auto pb-8 pt-0")}>
                {/* NLP Highlights display */}
                {(parsedData?.dueDate || parsedData?.priority || parsedData?.projectId || parsedData?.recurrence || parsedData?.isFrog || parsedData?.isLightning || parsedData?.isWaiting) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-4 mb-4">
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
                        {parsedData.isFrog && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 backdrop-blur-md">
                                <span className="leading-none select-none text-[10px]">🐸</span> Daily Frog
                            </span>
                        )}
                        {parsedData.isLightning && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 backdrop-blur-md">
                                <Zap className="w-3 h-3" /> Lightning
                            </span>
                        )}
                        {parsedData.isWaiting && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-500 flex items-center gap-1.5 backdrop-blur-md">
                                <Hourglass className="w-3 h-3" /> Waiting
                            </span>
                        )}
                    </div>
                )}

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
                            maxLength={2000}
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
            <Card className="w-full max-w-2xl h-auto min-h-[70vh] md:min-h-[600px] shadow-2xl border bg-card/95 backdrop-blur-xl relative flex flex-col items-center justify-between text-center rounded-[2rem] group transition-all duration-500 overflow-y-auto overflow-x-hidden ring-1 ring-white/5 scrollbar-none">
                {innerContent}
            </Card>
        </SwipeableTask>
    );
}
