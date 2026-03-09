'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { List, GripVertical, CheckCircle2, Circle, Calendar, ArrowUpDown, Repeat } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn, generateId } from '@/lib/utils';
import { Task } from '@/types';
import { ReactNode } from 'react';
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { getIconComponent } from '@/lib/icons';

// Imports update
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Search, CornerUpLeft, ArrowUpCircle, Archive, Trash2, FileText, Edit2, Moon, Lightbulb, CornerDownLeft, AlertCircle, ListFilter, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from "sonner";
import { AddTaskModal } from './add-task-modal';
import { ProjectSelect } from './project-select';
import { parseTaskInput, ParsedToken } from '@/lib/smart-parser';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SwipeableTask } from '@/components/ui/swipeable-task';
import { FormattedText } from './ui/formatted-text';
import { soundEngine } from '@/lib/sound-engine';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from '@/components/mentions-list';
import { Plus } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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

export interface QueueViewProps {
    customTrigger?: ReactNode;
    defaultTab?: 'active' | 'drafts';
    variant?: 'sheet' | 'fullscreen';
}

function QueueContent({ defaultTab, variant = 'sheet', mode = 'active' }: { defaultTab?: 'active' | 'drafts', variant?: 'sheet' | 'fullscreen', mode?: 'active' | 'drafts' }) {
    const {
        tasks,
        projects,
        activeProject,
        setTask,
        updateTask,
        activeSheet,
        setOpenSheet,
        deleteTask,
        archiveTask,
        completeTask,
        toggleDraft,
        undo,
        wakeTask, // Added wakeTask
        snoozeTask, // Added snoozeTask
        getAutoPickedTask,
        settings, // Add settings to destructuring
        view,
        setView
    } = useMonocleStore();
    const draftsRef = useRef<HTMLDivElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [quickAddValue, setQuickAddValue] = useState('');
    const [quickAddProjectId, setQuickAddProjectId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Initialize sortMode from settings
    const [sortMode, setSortMode] = useState<'manual' | 'date' | 'priority'>(settings.sortMode);

    // Multi-task paste state
    const [pendingPaste, setPendingPaste] = useState<string[] | null>(null);

    // Derived state for open/close based on variant
    // If fullscreen, we are always "open" in context of this component rendering
    // If sheet, we use activeSheet
    const open = variant === 'fullscreen' || activeSheet === 'queue';

    // Edit State
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [editModalOpen, setEditModalOpen] = useState(false);

    // Determine if this specific QueueView component is actually visible to the user
    // This prevents background variants (like the hidden Sheet) from rendering portals (like Tooltips)
    const isVisible = variant === 'fullscreen'
        ? (mode === 'drafts' ? view === 'ideas' : view === 'queue')
        : activeSheet === 'queue';

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    // Snooze Drag State
    const [pendingSnoozeTask, setPendingSnoozeTask] = useState<Task | null>(null);

    // Auto-refresh interval so "On Hold" tasks natively pop back into the list
    const [renderTick, setRenderTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setRenderTick(prev => prev + 1);
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // Media query for mobile detection
    const [isBelowMd, setIsBelowMd] = useState(false);
    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 768px)'); // md breakpoint
        const handleMediaQueryChange = (event: MediaQueryListEvent) => {
            setIsBelowMd(event.matches);
        };

        setIsBelowMd(mediaQuery.matches); // Set initial state
        mediaQuery.addEventListener('change', handleMediaQueryChange);

        return () => {
            mediaQuery.removeEventListener('change', handleMediaQueryChange);
        };
    }, []);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setEditModalOpen(true);
    };

    // Mentions logic
    const { activeTrigger, filterText, isOpen: isMentionsOpen, onInputChange: onMentionChange, triggerIndex, closeMentions } = useMentions({ inputRef });
    const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

    const mentionOptions: MentionOption[] = useMemo(() => {
        if (!activeTrigger) return [];
        if (activeTrigger === '#') {
            const lowerFilter = filterText.toLowerCase();
            const matches = projects
                .filter(p => p.name.toLowerCase().includes(lowerFilter))
                .slice(0, 5)
                .map(p => ({
                    label: p.name,
                    value: p.id,
                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                }));

            const exactMatch = projects.find(p => p.name.toLowerCase() === lowerFilter);
            if (lowerFilter.length > 0 && !exactMatch) {
                matches.push({
                    label: `Create "${filterText}"...`,
                    value: `create_${filterText}`,
                    icon: <Plus className="w-3 h-3 text-muted-foreground" />
                });
            }
            return matches;
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
                    color: '#6366f1',
                    icon: 'Folder'
                });
                setQuickAddProjectId(newProjectId);
                toast.success(`Created project "${newProjectName}"`);
            } else {
                setQuickAddProjectId(option.value);
            }

            const newValue = before + after;
            setQuickAddValue(newValue);

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(before.length, before.length);
            }, 0);
        }
        closeMentions();
    };

    const handleQuickAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const parsedQuickAddResult = quickAddValue ? parseTaskInput(quickAddValue, projects) : null;
        if (e.key === 'Backspace' && inputRef.current && parsedQuickAddResult?.matchedTokens) {
            const cursorPosition = inputRef.current.selectionStart;
            const textBeforeCursor = quickAddValue.substring(0, cursorPosition || 0);

            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            for (const token of parsedQuickAddResult.matchedTokens) {
                // Must be at exactly the end of the token
                const regex = new RegExp(escapeRegExp(token.text) + "$", "i");
                if (regex.test(textBeforeCursor)) {
                    e.preventDefault();

                    const match = textBeforeCursor.match(regex)!;
                    const tokenTextPos = textBeforeCursor.lastIndexOf(match[0]);
                    const beforeToken = quickAddValue.substring(0, tokenTextPos);
                    const tokenText = match[0];

                    // Insert \u200B right before the last character
                    const modifiedToken = tokenText.substring(0, tokenText.length - 1) + '\u200B' + tokenText.substring(tokenText.length - 1);
                    const afterToken = quickAddValue.substring(cursorPosition || 0);

                    setQuickAddValue(beforeToken + modifiedToken + afterToken);

                    setTimeout(() => {
                        const newPos = (cursorPosition || 0) + 1;
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

        if (e.key === 'Enter') {
            if (isMentionsOpen && mentionOptions.length > 0) {
                e.preventDefault();
                handleMentionSelect(mentionOptions[mentionSelectedIndex]);
                return;
            }
            const isDraft = mode === ('drafts' as any) ? !e.shiftKey : e.shiftKey;
            handleQuickAdd(isDraft);
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

    // Swipe-to-navigate logic for Queue View
    const queueTouchStartRef = useRef<{ x: number, y: number, isAtTop: boolean, isAtBottom: boolean } | null>(null);

    const handleQueueTouchStart = (e: React.TouchEvent) => {
        let isAtTop = true;
        let isAtBottom = true;

        const target = e.target as HTMLElement;
        const scrollContainer = target.closest('.overflow-y-auto') as HTMLElement;

        if (scrollContainer) {
            isAtTop = scrollContainer.scrollTop <= 0;
            // Add a 5px forgiveness margin for fractional pixel scrolling
            isAtBottom = Math.ceil(scrollContainer.scrollTop + scrollContainer.clientHeight) >= scrollContainer.scrollHeight - 5;
        }

        queueTouchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            isAtTop,
            isAtBottom
        };
    };

    const handleQueueTouchEnd = (e: React.TouchEvent) => {
        if (!queueTouchStartRef.current) return;

        const { x: startX, y: startY, isAtTop, isAtBottom } = queueTouchStartRef.current;
        const deltaY = e.changedTouches[0].clientY - startY;
        const deltaX = Math.abs(e.changedTouches[0].clientX - startX);

        // Only trigger if it's a strongly vertical swipe and not a lateral scroll
        if (deltaX < 75) {
            if (deltaY > 150 && isAtTop) {
                // Swiped Down (Pulling from top) -> Go to Focus while list is at top
                setView('focus');
            } else if (deltaY < -150 && isAtBottom) {
                // Swiped Up (Pulling from bottom) -> Go to Capture while list is at bottom
                setView('capture');
            }
        }
        queueTouchStartRef.current = null;
    };

    // Scroll to section when opened with specific tab
    useEffect(() => {
        if (open && defaultTab === 'drafts' && draftsRef.current) {
            setTimeout(() => {
                draftsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    }, [open, defaultTab]);

    // Filter locally to get the lists
    const visibleTasks = tasks.filter(t => {
        if (activeProject) return t.projectId === activeProject;
        if (t.projectId) {
            const project = projects.find(p => p.id === t.projectId);
            if (project?.excludeFromQueue) return false;
        }
        return true;
    });

    // Then separate active vs draft
    // And apply search filter
    const matchesSearch = (t: Task) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());

    // Evaluate pure time before render loops
    const now = Date.now();

    let activeTasks = visibleTasks.filter(t => !t.isDraft && t.status !== 'done' && (!t.skippedUntil || t.skippedUntil <= now) && matchesSearch(t));

    // Mathematically pin the Daily Frog to the absolute top of the Active Tasks queue
    const activeFrogIndex = activeTasks.findIndex(t => t.isFrog);
    if (activeFrogIndex > 0) {
        const frog = activeTasks[activeFrogIndex];
        activeTasks.splice(activeFrogIndex, 1);
        activeTasks.unshift(frog);
    }

    const snoozedTasks = visibleTasks.filter(t => !t.isDraft && t.status !== 'done' && (t.skippedUntil && t.skippedUntil > now) && matchesSearch(t));
    const draftTasks = visibleTasks.filter(t => t.isDraft && t.status !== 'done' && matchesSearch(t));

    const currentActiveTask = getAutoPickedTask();

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        if (sortMode === 'date' || searchQuery) return; // Disable DnD when sorted or searching

        const sourceList = result.source.droppableId === 'active' ? activeTasks : draftTasks;
        const draggedTask = sourceList[result.source.index];

        // --- FROG QUEUE PROTECTION RULES ---
        if (result.destination.droppableId === 'active') {
            // Cannot drag the Frog down
            if (draggedTask.isFrog && result.destination.index !== 0) {
                toast.error("The Daily Frog must remain at the top of the queue.");
                return;
            }
            // Cannot drag a normal task above the Frog
            if (!draggedTask.isFrog && result.destination.index === 0 && activeTasks[0]?.isFrog) {
                toast.error("Cannot place a task above the Daily Frog.");
                return;
            }
        }
        // -----------------------------------

        // Intercept drop into On Hold
        if (result.destination.droppableId === 'on-hold') {
            if (draggedTask) {
                setPendingSnoozeTask(draggedTask);
            }
            return;
        }

        // Intercept drop into Idea Dump (from Active View)
        // Since the drafts list isn't rendered, we just toggle the status instead of sorting arrays.
        if (result.destination.droppableId === 'drafts' && result.source.droppableId === 'active') {
            if (draggedTask) {
                useMonocleStore.getState().toggleDraft(draggedTask.id);
                toast("Saved to Idea Dump", {
                    action: {
                        label: "Undo",
                        onClick: () => useMonocleStore.getState().toggleDraft(draggedTask.id)
                    }
                });
            }
            return;
        }

        const destList = result.destination.droppableId === 'active' ? activeTasks : draftTasks;

        // Create copies
        const newSource = Array.from(sourceList);
        const newDest = result.source.droppableId === result.destination.droppableId ? newSource : Array.from(destList);

        // Remove from source
        const [movedTask] = newSource.splice(result.source.index, 1);

        // Add to destination
        newDest.splice(result.destination.index, 0, movedTask);

        // If moved between lists, update draft status
        if (result.source.droppableId !== result.destination.droppableId) {
            movedTask.isDraft = result.destination.droppableId === 'drafts';
        }

        // Now reconstruct the GLOBAL state
        const involvedIds = new Set([...activeTasks.map(t => t.id), ...draftTasks.map(t => t.id)]);
        const uninvolvedTasks = tasks.filter(t => !involvedIds.has(t.id));

        let finalActive = result.destination.droppableId === 'active' ? newDest : (result.source.droppableId === 'active' ? newSource : activeTasks);
        let finalDrafts = result.destination.droppableId === 'drafts' ? newDest : (result.source.droppableId === 'drafts' ? newSource : draftTasks);

        setTask([...finalActive, ...finalDrafts, ...uninvolvedTasks, ...snoozedTasks]);
    };

    const handleSnoozeDrop = (durationMinutes: number, label: string) => {
        if (pendingSnoozeTask) {
            snoozeTask(durationMinutes, pendingSnoozeTask.id);
            toast("Task on hold", {
                description: `Held for ${label}`,
                action: { label: "Undo", onClick: () => undo() }
            });
            setPendingSnoozeTask(null);
        }
    };

    const handleQuickAdd = (isDraft: boolean = false) => {
        const finalTitle = quickAddValue.replace(/\u200B/g, '').trim();
        if (!finalTitle) return;

        const { projects } = useMonocleStore.getState();
        const parsedResult = parseTaskInput(quickAddValue, projects);

        const newTask: Task = {
            id: generateId(),
            title: finalTitle,
            description: '',
            status: 'todo',
            priority: parsedResult.priority || 'medium',
            projectId: quickAddProjectId || parsedResult.projectId || activeProject || undefined,
            dueDate: parsedResult.dueDate,
            recurrence: parsedResult.recurrence,
            duration: parsedResult.duration,
            isFrog: parsedResult.isFrog,
            isLightning: parsedResult.isLightning,
            isDraft,
            createdAt: Date.now(),
        };
        useMonocleStore.getState().addTask(newTask);
        setQuickAddValue('');
        setQuickAddProjectId(null);
        toast(isDraft ? "Added to Idea Dump" : "Added to Queue", { description: newTask.title });
    };

    const handleBatchAdd = (lines: string[], isDraft: boolean) => {
        const { projects, addTask } = useMonocleStore.getState();
        let count = 0;

        lines.forEach(line => {
            const trimmed = line.replace(/\u200B/g, '').trim();
            if (!trimmed) return;

            const parsedResult = parseTaskInput(line, projects);

            const newTask: Task = {
                id: generateId(),
                title: trimmed,
                description: '',
                status: 'todo',
                priority: parsedResult.priority || 'medium',
                projectId: parsedResult.projectId || activeProject || undefined,
                dueDate: parsedResult.dueDate,
                recurrence: parsedResult.recurrence,
                duration: parsedResult.duration,
                isFrog: parsedResult.isFrog,
                isLightning: parsedResult.isLightning,
                isDraft,
                createdAt: Date.now() + count, // offset to maintain order
            };
            addTask(newTask);
            count++;
        });

        setPendingPaste(null);
        toast(`Added ${count} ${isDraft ? 'ideas' : 'tasks'}!`);
    };

    // Context Menu Handlers
    const handleFocusNow = (taskId: string) => {
        // Move to top of list
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const otherTasks = tasks.filter(t => t.id !== taskId);
        const updatedTask = { ...task, isDraft: false }; // Ensure it's active


        // Let's just manually reorder for now.
        setTask([updatedTask, ...otherTasks]);
        setOpenSheet(null); // Close queue to focus
        toast("Focused task", { description: task.title });
    };

    const handleMakeNext = (taskId: string) => {
        // Move to position #2
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const visible = tasks.filter(t => !t.isDraft && t.status !== 'done' && (activeProject ? t.projectId === activeProject : true));
        const otherTasks = tasks.filter(t => t.id !== taskId);
        const updatedTask = { ...task, isDraft: false };

        if (visible.length > 0) {
            const first = visible[0];
            // Insert after first
            if (first.id === taskId) return; // Already first

            const firstIndex = otherTasks.findIndex(t => t.id === first.id);
            otherTasks.splice(firstIndex + 1, 0, updatedTask);
            setTask(otherTasks);
        } else {
            setTask([updatedTask, ...otherTasks]);
        }

        toast("Moved to next", { description: "Position #2" });
    };

    const handleDump = (taskId: string) => {
        toggleDraft(taskId);
        toast("Moved to Idea Dump", {
            action: { label: "Undo", onClick: () => undo() }
        });
    };

    const handleDelete = (taskId: string) => {
        setTaskToDelete(taskId);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (taskToDelete) {
            deleteTask(taskToDelete);
            toast("Task deleted", {
                action: { label: "Undo", onClick: () => undo() }
            });
            setTaskToDelete(null);
            setDeleteConfirmOpen(false);
        }
    };

    const handleArchive = (taskId: string) => {
        const result = archiveTask(taskId);

        if (result?.nextTask) {
            toast("Recurring task archived", {
                description: `Next instance scheduled for ${format(result.nextTask.dueDate || Date.now(), 'MMM d')}`,
                action: { label: "Undo", onClick: () => undo() },
                duration: 5000
            });
        } else {
            toast("Task archived", {
                action: { label: "Undo", onClick: () => undo() }
            });
        }
    };

    const handleSkip = (taskId: string) => {
        const taskToSkip = tasks.find(t => t.id === taskId);
        if (taskToSkip) {
            useMonocleStore.getState().skipTask(taskId);
            toast("Task passed", {
                description: taskToSkip.isFrog ? "The Frog Will Return...SOON." : "Moved to bottom of Queue",
                action: { label: "Undo", onClick: () => useMonocleStore.getState().undo() }
            });
        }
    };

    const handlePromote = (taskId: string) => {
        useMonocleStore.getState().promoteTask(taskId);
        soundEngine.playPromote();
        toast("Sent to Queue 🚀", { description: "Promoted from Drafts" });
    };

    const handleComplete = (taskId: string) => {
        const result = completeTask(taskId);

        if (result?.nextTask) {
            toast("Recurring task completed", {
                description: `Next instance scheduled for ${format(result.nextTask.dueDate || Date.now(), 'MMM d')}`,
                action: { label: "Undo", onClick: () => undo() },
                duration: 5000
            });
        } else {
            toast("Task completed", {
                action: { label: "Undo", onClick: () => undo() }
            });
        }
    };

    const parsedQuickAddResult = quickAddValue ? parseTaskInput(quickAddValue, projects) : null;

    return (
        <>
            <TooltipProvider>
                <div
                    className={cn("flex flex-col h-full bg-background/95 backdrop-blur p-0 gap-0", variant === 'fullscreen' ? "w-full max-w-3xl mx-auto md:border-x shadow-2xl h-[95vh] md:rounded-xl md:my-4" : "")}
                    onTouchStart={handleQueueTouchStart}
                    onTouchEnd={handleQueueTouchEnd}
                >
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b flex flex-row items-center justify-between gap-3 shrink-0">
                        <button
                            onClick={() => setView(mode === 'active' ? 'ideas' : 'queue')}
                            className="text-xl sm:text-2xl font-bold flex items-center gap-2 hover:opacity-75 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 -ml-1 text-left"
                            title={mode === 'active' ? "Switch to Idea Dump" : "Switch to Queue"}
                        >
                            <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                            <span>{mode === 'active' ? 'Queue' : 'Idea Dump'}</span>
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                            {activeProject && <span className="text-sm font-normal text-muted-foreground ml-1">(Filtered)</span>}
                        </button>

                        {/* Search Input */}
                        <div className="flex items-center gap-2 shrink-0">
                            {(!isBelowMd || isSearchActive) ? (
                                <div className="relative w-full sm:w-64 animate-in fade-in slide-in-from-right-2">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tasks..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 bg-muted/50 border-none shadow-none h-9 text-sm"
                                        autoFocus={isSearchActive}
                                    />
                                    {isBelowMd && (
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                                            onClick={() => {
                                                setIsSearchActive(false);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 ml-auto text-muted-foreground hover:bg-muted"
                                    onClick={() => setIsSearchActive(true)}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex-1 overflow-hidden flex flex-col">

                            {/* Active Queue */}
                            {mode === 'active' && (
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 md:p-4 pb-0">
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
                                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold shrink-0">{activeTasks.length}</span>
                                        </div>
                                        <div className="flex">
                                            <button
                                                onClick={() => {
                                                    let newSortMode: 'manual' | 'date' | 'priority' = 'manual';
                                                    if (sortMode === 'manual') newSortMode = 'date';
                                                    else if (sortMode === 'date') newSortMode = 'priority';

                                                    setSortMode(newSortMode);
                                                    useMonocleStore.getState().updateSettings({ sortMode: newSortMode });
                                                }}
                                                disabled={!!searchQuery}
                                                className="px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 bg-background text-foreground shadow-sm ring-1 ring-black/5 hover:bg-muted"
                                            >
                                                {sortMode === 'manual' && <ListFilter className="h-3.5 w-3.5" />}
                                                {sortMode === 'date' && <Calendar className="h-3.5 w-3.5" />}
                                                {sortMode === 'priority' && <AlertCircle className="h-3.5 w-3.5" />}
                                                {sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}
                                                <div className="h-3 w-[1px] bg-border mx-0.5" />
                                                <span className="text-[10px] text-muted-foreground">Sort</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Add Input */}
                                    {!searchQuery && (
                                        <div className="px-4 pb-4">
                                            <div className="relative">
                                                {/* Hidden indicator if a project was selected inline */}
                                                {quickAddProjectId && (
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        {(() => {
                                                            const p = projects.find(p => p.id === quickAddProjectId);
                                                            if (!p) return null;
                                                            return <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />;
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="relative flex items-center w-full rounded-md bg-card">
                                                    {/* Syntax Highlighting Background Overlay */}
                                                    <div
                                                        className={cn(
                                                            "absolute inset-0 pointer-events-none w-full bg-transparent flex items-center pr-16 whitespace-pre font-medium sm:text-sm text-base truncate text-transparent",
                                                            quickAddProjectId ? "pl-10" : "pl-4", // Match input padding left based on project badge presence
                                                            tasks.length <= 1 && !quickAddValue && "opacity-0" // Hide when ring effect is active
                                                        )}
                                                        aria-hidden="true"
                                                    >
                                                        {renderHighlightedText(quickAddValue, parsedQuickAddResult?.matchedTokens || [])}
                                                    </div>

                                                    <Input
                                                        ref={inputRef}
                                                        value={quickAddValue}
                                                        onChange={(e) => {
                                                            setQuickAddValue(e.target.value);
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
                                                        onKeyDown={handleQuickAddKeyDown}
                                                        placeholder={mode === ('drafts' as any) ? (isBelowMd ? "Add an idea..." : "Add an idea... (Enter = save)") : (isBelowMd ? "Add a task..." : "Add a task... (Enter = save, Shift+Enter = draft)")}
                                                        className={cn(
                                                            "bg-transparent border-dashed border-2 shadow-none focus-visible:ring-0 focus-visible:border-primary/50 pr-16 transition-all text-foreground caret-foreground relative z-10 w-full font-medium sm:text-sm text-base",
                                                            quickAddProjectId ? "pl-10" : "pl-4", // Update input padding
                                                            tasks.length <= 1 && !quickAddValue && "border-primary/50 ring-2 ring-primary/20 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]"
                                                        )}
                                                    />
                                                </div>
                                                {isMentionsOpen && (
                                                    <div className="absolute top-[calc(100%+4px)] left-0 z-50">
                                                        <MentionsList
                                                            options={mentionOptions}
                                                            onSelect={handleMentionSelect}
                                                            selectedIndex={mentionSelectedIndex}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 min-h-0">
                                        <div className="h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden pt-1 pb-32 -mx-4 px-4">
                                            {sortMode === 'manual' && !searchQuery ? (
                                                <>
                                                    <Droppable droppableId="active">
                                                        {(provided) => (
                                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 pb-4 min-h-[50px]">
                                                                {activeTasks.length === 0 && (
                                                                    <div className="text-center py-10 px-6 text-muted-foreground/60 text-sm border-2 border-dashed rounded-xl flex flex-col items-center gap-2">
                                                                        <p className="font-medium text-foreground/80">{activeProject ? `No tasks in ${projects.find(p => p.id === activeProject)?.name || 'this project'}.` : "Your queue is clear."}</p>
                                                                        <p className="text-xs max-w-xs leading-relaxed">{activeProject ? "Add a new task below, or return to the main queue." : "Monocle is a merciless execution engine. Add your first task below to begin."}</p>
                                                                    </div>
                                                                )}
                                                                {activeTasks.map((task, index) => (
                                                                    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={task.isFrog}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                style={{
                                                                                    ...provided.draggableProps.style,
                                                                                    left: "auto",
                                                                                    top: "auto"
                                                                                }}
                                                                                className={cn("w-full outline-none", task.id === currentActiveTask?.id ? "z-10 relative" : "")}
                                                                            >
                                                                                <SwipeableTask
                                                                                    task={task}
                                                                                    isMobile={isBelowMd}
                                                                                    leftAction={(id) => handleComplete(id)}
                                                                                    rightAction={(id) => {
                                                                                        const taskToSkip = tasks.find(t => t.id === id);
                                                                                        if (taskToSkip) {
                                                                                            useMonocleStore.getState().skipTask(id);
                                                                                            toast("Task passed", {
                                                                                                description: taskToSkip.isFrog ? "The Frog Will Return...SOON." : "Moved to bottom of Queue",
                                                                                                action: { label: "Undo", onClick: () => useMonocleStore.getState().undo() }
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <div
                                                                                        className={cn(
                                                                                            "group bg-card border rounded-lg shadow-sm hover:shadow-md transition-all select-none outline-none flex items-center gap-3 py-2 px-3 relative overflow-hidden",
                                                                                            task.isFrog && "border-l-4 border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20",
                                                                                            task.isFrog && (Date.now() - task.createdAt > 3 * 24 * 60 * 60 * 1000) && "scale-[1.03] shadow-lg shadow-red-500/10 border-red-500/50 ring-red-500/20 my-2 z-20",
                                                                                            task.isLightning && !task.isFrog && "border-l-4 border-l-yellow-500 bg-yellow-500/5 ring-1 ring-yellow-500/20",
                                                                                            task.id === currentActiveTask?.id && !task.isFrog && !task.isLightning && "border-l-4 border-l-primary bg-primary/5 shadow-md scale-[1.02] z-10 my-1",
                                                                                            task.id === currentActiveTask?.id && task.isFrog && "shadow-md shadow-emerald-500/10 scale-[1.02] z-10 my-1 border-l-emerald-500",
                                                                                            task.id === currentActiveTask?.id && task.isLightning && !task.isFrog && "shadow-md shadow-yellow-500/10 scale-[1.02] z-10 my-1 border-l-yellow-500",
                                                                                            snapshot.isDragging && "opacity-50 ring-2 ring-primary ring-offset-2 z-50",
                                                                                            (Date.now() - task.createdAt < 2000) && "animate-in fade-in slide-in-from-top-4 duration-500"
                                                                                        )}
                                                                                    >
                                                                                        {/* Frog Glow Background Layer */}
                                                                                        {task.isFrog && (
                                                                                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
                                                                                        )}

                                                                                        {/* Drag Handle */}
                                                                                        <div {...provided.dragHandleProps} className="text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0 relative z-10 touch-none">
                                                                                            <GripVertical className="h-4 w-4" />
                                                                                        </div>

                                                                                        {/* Content Area with Context Menu */}
                                                                                        <ContextMenu>
                                                                                            <ContextMenuTrigger
                                                                                                className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center"
                                                                                                onDoubleClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    handleEdit(task);
                                                                                                }}
                                                                                            >
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
                                                                                                    <p className={cn(
                                                                                                        "text-sm font-medium truncate",
                                                                                                        task.id === currentActiveTask?.id && !task.isFrog && !task.isLightning && "text-primary font-bold",
                                                                                                        task.isFrog && "text-emerald-700 dark:text-emerald-400 font-bold",
                                                                                                        task.isFrog && (Date.now() - task.createdAt > 3 * 24 * 60 * 60 * 1000) && "text-base font-extrabold text-red-600 dark:text-red-400",
                                                                                                        task.isLightning && !task.isFrog && "text-yellow-700 dark:text-yellow-400 font-bold"
                                                                                                    )}>
                                                                                                        <FormattedText text={task.title} />
                                                                                                    </p>
                                                                                                    {task.isFrog && (
                                                                                                        <span className="text-sm leading-none shrink-0">🐸</span>
                                                                                                    )}
                                                                                                    {task.isLightning && !task.isFrog && (
                                                                                                        <span className="text-sm leading-none shrink-0">⚡️</span>
                                                                                                    )}
                                                                                                </div>
                                                                                                {task.description && (
                                                                                                    <Tooltip>
                                                                                                        <TooltipTrigger asChild>
                                                                                                            <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-0.5 max-w-[90%]">
                                                                                                                {task.description}
                                                                                                            </p>
                                                                                                        </TooltipTrigger>
                                                                                                        <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                                                                                                            <FormattedText text={task.description} className="text-xs" />
                                                                                                        </TooltipContent>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                                                    {task.dueDate && (
                                                                                                        <span className={cn("flex items-center gap-1", isPast(task.dueDate) && !isToday(task.dueDate) && "text-red-500 font-bold")}>
                                                                                                            <Calendar className="h-3 w-3" />
                                                                                                            {format(task.dueDate, 'MMM d')}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {task.recurrence && (
                                                                                                        <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}>
                                                                                                            <Repeat className="h-3 w-3" />
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {task.priority === 'high' && (
                                                                                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                                                                                    )}
                                                                                                    {task.priority === 'low' && (
                                                                                                        <ArrowUpDown className="h-3 w-3 text-blue-500" />
                                                                                                    )}
                                                                                                </div>
                                                                                            </ContextMenuTrigger>
                                                                                            <ContextMenuContent>
                                                                                                <ContextMenuItem onClick={() => handleFocusNow(task.id)}>
                                                                                                    <CornerUpLeft className="mr-2 h-4 w-4" /> Focus Now
                                                                                                </ContextMenuItem>
                                                                                                <ContextMenuItem onClick={() => handleEdit(task)}>
                                                                                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                                                                                </ContextMenuItem>
                                                                                                <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}>
                                                                                                    <FileText className="mr-2 h-4 w-4" /> Duplicate
                                                                                                </ContextMenuItem>
                                                                                                <ContextMenuSeparator />
                                                                                                <ContextMenuItem onClick={() => useMonocleStore.getState().toggleFrog(task.id)}>
                                                                                                    <span className="mr-2 text-sm leading-none">🐸</span> {task.isFrog ? 'Unmark Frog' : 'Mark as Daily Frog'}
                                                                                                </ContextMenuItem>
                                                                                                <ContextMenuSeparator />
                                                                                                <ContextMenuItem onClick={() => handleMakeNext(task.id)}>
                                                                                                    <ArrowUpCircle className="mr-2 h-4 w-4" /> Make Next
                                                                                                </ContextMenuItem>
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

                                                                                        {/* Indicators and Actions */}
                                                                                        {task.id === currentActiveTask?.id && <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Now</span>}
                                                                                        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full relative"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleComplete(task.id);
                                                                                                }}
                                                                                                title="Complete Task"
                                                                                            >
                                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-full relative"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleDump(task.id);
                                                                                                }}
                                                                                                title="Send to Idea Dump"
                                                                                            >
                                                                                                <Lightbulb className="h-3 w-3" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleArchive(task.id);
                                                                                                }}
                                                                                                title="Archive Task"
                                                                                            >
                                                                                                <Archive className="h-3 w-3" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleEdit(task);
                                                                                                }}
                                                                                                title="Edit Task"
                                                                                            >
                                                                                                <Edit2 className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                </SwipeableTask>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>

                                                    {/* On Hold Section */}
                                                    <Droppable droppableId="on-hold">
                                                        {(provided, snapshot) => (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className={cn(
                                                                    "mt-8 space-y-2 pb-4 transition-colors rounded-xl min-h-[50px]",
                                                                    snapshot.isDraggingOver ? "bg-muted/50 ring-2 ring-primary/20 ring-inset" : ""
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2 px-2 pt-2 mb-3">
                                                                    <Moon className="h-3 w-3 text-muted-foreground" />
                                                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                                        On Hold
                                                                        <span className="bg-muted px-1.5 py-0.5 rounded-full">{snoozedTasks.length}</span>
                                                                    </h3>
                                                                </div>
                                                                {snoozedTasks.length === 0 && (
                                                                    <div className="text-center py-4 px-4 text-muted-foreground/30 italic text-xs border-2 border-dashed border-muted-foreground/10 rounded-xl">
                                                                        Drop tasks here to hold them.
                                                                    </div>
                                                                )}
                                                                {snoozedTasks.map((task) => (
                                                                    // Not Draggable out of the Snooze area purely for simplicity right now.
                                                                    // We use the Wake Up button or wait for timeout.
                                                                    <div
                                                                        key={task.id}
                                                                        className="group bg-card/50 border rounded-lg shadow-sm hover:shadow-md transition-all select-none outline-none flex items-center gap-3 p-3 opacity-60 bg-muted/40"
                                                                    >
                                                                        {/* Content Area */}
                                                                        <div className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center">
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-sm font-medium truncate">
                                                                                    <FormattedText text={task.title} />
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                                {task.skippedUntil && task.skippedUntil > Date.now() && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            wakeTask(task.id);
                                                                                            toast("Task woke up", { description: "Moved to active queue" });
                                                                                        }}
                                                                                        className="flex items-center gap-1 text-muted-foreground/80 hover:text-foreground bg-muted/50 hover:bg-muted px-1.5 py-0.5 rounded-md transition-all active:scale-95"
                                                                                        title="Click to wake up early"
                                                                                    >
                                                                                        <Moon className="h-3 w-3" />
                                                                                        Hidden till {format(task.skippedUntil, 'h:mm a')}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>

                                                    {/* Idea Dump Dropzone (Active Mode Only) */}
                                                    <Droppable droppableId="drafts">
                                                        {(provided, snapshot) => (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className={cn(
                                                                    "mt-4 transition-colors rounded-xl border-2 border-dashed flex items-center justify-center py-4 opacity-50 transition-opacity min-h-[50px]",
                                                                    snapshot.isDraggingOver ? "opacity-100 bg-primary/10 border-primary/40 text-foreground" : "border-muted-foreground/20 text-muted-foreground"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2 pointer-events-none">
                                                                    <Lightbulb className={cn("h-4 w-4", snapshot.isDraggingOver && "text-primary")} />
                                                                    <span className="text-xs font-medium uppercase tracking-widest">Send to Idea Dump</span>
                                                                </div>
                                                                <div className="hidden">{provided.placeholder}</div>
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </>
                                            ) : (
                                                // Manual list without DnD (Search or Sort enabled)
                                                <div className="space-y-6 pb-4">
                                                    {/* Reuse Grouping Logic OR Simple List if Searching */}
                                                    {searchQuery ? (
                                                        <div className="space-y-2">
                                                            {activeTasks.length === 0 && <div className="text-muted-foreground text-sm">No matches.</div>}
                                                            {activeTasks.map(task => (
                                                                <div key={task.id} className="group bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                                                                    <div className="flex-1 min-w-0">
                                                                        <FormattedText text={task.title} className="text-sm font-medium truncate" />
                                                                    </div>
                                                                    <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }} title="Complete Task"><CheckCircle2 className="h-3 w-3" /></Button>
                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDump(task.id); }} title="Send to Idea Dump"><Lightbulb className="h-3 w-3" /></Button>
                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleFocusNow(task.id); }} title="Promote to Focus"><CornerUpLeft className="h-3 w-3" /></Button>
                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : sortMode === 'date' ? (
                                                        // Date Grouping logic ... (simplified for brevity, keeping existing logic structure)
                                                        (() => {
                                                            const groups: Record<string, Task[]> = {
                                                                'Overdue': [], 'Today': [], 'Tomorrow': [], 'Upcoming': [], 'Later': [], 'No Date': []
                                                            };
                                                            activeTasks.forEach(t => {
                                                                if (t.isFrog) groups['Today'].push(t);
                                                                else if (!t.dueDate) groups['No Date'].push(t);
                                                                else if (isPast(t.dueDate) && !isToday(t.dueDate)) groups['Overdue'].push(t);
                                                                else if (isToday(t.dueDate)) groups['Today'].push(t);
                                                                else if (isTomorrow(t.dueDate)) groups['Tomorrow'].push(t);
                                                                else if (isThisWeek(t.dueDate)) groups['Upcoming'].push(t);
                                                                else groups['Later'].push(t);
                                                            });
                                                            const groupOrder = ['Overdue', 'Today', 'Tomorrow', 'Upcoming', 'Later', 'No Date'];
                                                            return groupOrder.map(groupName => {
                                                                const tasks = groups[groupName];
                                                                if (tasks.length === 0) return null;

                                                                const sortedTasks = [...tasks].sort((a, b) => {
                                                                    if (a.isFrog) return -1;
                                                                    if (b.isFrog) return 1;

                                                                    // Keep chronological order within the group
                                                                    if (a.dueDate && b.dueDate) {
                                                                        return a.dueDate - b.dueDate;
                                                                    }
                                                                    if (a.dueDate) return -1;
                                                                    if (b.dueDate) return 1;

                                                                    return 0;
                                                                });

                                                                return (
                                                                    <div key={groupName} className="space-y-2">
                                                                        <h4 className={cn("text-[10px] uppercase font-bold tracking-wider mb-2", groupName === 'Overdue' ? "text-red-500" : "text-muted-foreground")}>{groupName}</h4>
                                                                        {sortedTasks.map(task => (
                                                                            // Context Menu wrapper for sorted items too
                                                                            <ContextMenu key={task.id}>
                                                                                <ContextMenuTrigger
                                                                                    onDoubleClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        handleEdit(task);
                                                                                    }}
                                                                                >
                                                                                    <SwipeableTask
                                                                                        key={task.id}
                                                                                        task={task}
                                                                                        isMobile={isBelowMd}
                                                                                        leftAction={() => handleComplete(task.id)}
                                                                                        rightAction={() => handleDump(task.id)}
                                                                                        onTap={(task) => handleEdit(task)}
                                                                                        leftIcon={CheckCircle2}
                                                                                        leftLabel="Complete"
                                                                                        leftBgClass="bg-emerald-500"
                                                                                        leftColorClass="text-emerald-600"
                                                                                        rightIcon={Archive}
                                                                                        rightLabel="To Idea Dump"
                                                                                        rightBgClass="bg-indigo-500"
                                                                                        rightColorClass="text-indigo-600"
                                                                                    >
                                                                                        <div className={cn(
                                                                                            "group bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
                                                                                            task.isFrog && "border-l-4 border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20",
                                                                                            task.isFrog && (Date.now() - task.createdAt > 3 * 24 * 60 * 60 * 1000) && "scale-[1.03] shadow-lg shadow-red-500/10 border-red-500/50 ring-red-500/20 my-2 z-20",
                                                                                            task.isLightning && !task.isFrog && "border-l-4 border-l-yellow-500 bg-yellow-500/5 ring-1 ring-yellow-500/20"
                                                                                        )} onClick={() => handleEdit(task)}>
                                                                                            <div className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center">
                                                                                                <div className="flex items-center gap-2 mb-0.5 overflow-hidden w-full shrink-0">
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
                                                                                                    <p className={cn(
                                                                                                        "text-sm font-medium truncate",
                                                                                                        task.id === currentActiveTask?.id && !task.isFrog && !task.isLightning && "text-primary font-bold",
                                                                                                        task.isFrog && "text-emerald-700 dark:text-emerald-400 font-bold",
                                                                                                        task.isFrog && (Date.now() - task.createdAt > 3 * 24 * 60 * 60 * 1000) && "text-base font-extrabold text-red-600 dark:text-red-400",
                                                                                                        task.isLightning && !task.isFrog && "text-yellow-700 dark:text-yellow-400 font-bold"
                                                                                                    )}>
                                                                                                        <FormattedText text={task.title} />
                                                                                                    </p>
                                                                                                    {task.isFrog && <span className="text-sm leading-none shrink-0">🐸</span>}
                                                                                                    {task.isLightning && !task.isFrog && <span className="text-sm leading-none shrink-0">⚡️</span>}
                                                                                                </div>
                                                                                                {task.description && (
                                                                                                    <Tooltip>
                                                                                                        <TooltipTrigger asChild>
                                                                                                            <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-0.5 max-w-[90%]">
                                                                                                                {task.description}
                                                                                                            </p>
                                                                                                        </TooltipTrigger>
                                                                                                        <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                                                                                                            <FormattedText text={task.description} className="text-xs" />
                                                                                                        </TooltipContent>
                                                                                                    </Tooltip>
                                                                                                )}
                                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                                                    {task.dueDate && <span className={cn("flex items-center gap-1", isPast(task.dueDate) && !isToday(task.dueDate) && "text-red-500 font-bold")}><Calendar className="h-3 w-3" />{format(task.dueDate, 'MMM d')}</span>}
                                                                                                    {task.recurrence && <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}><Repeat className="h-3 w-3" /></span>}
                                                                                                    {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                                                    {task.priority === 'low' && <ArrowUpDown className="h-3 w-3 text-blue-500" />}
                                                                                                </div>
                                                                                            </div>
                                                                                            {task.id === currentActiveTask?.id && <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Now</span>}
                                                                                            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }} title="Complete Task"><CheckCircle2 className="h-3 w-3" /></Button>
                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDump(task.id); }} title="Send to Idea Dump"><Lightbulb className="h-3 w-3" /></Button>
                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleArchive(task.id); }} title="Archive Task"><Archive className="h-3 w-3" /></Button>
                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </SwipeableTask>
                                                                                </ContextMenuTrigger>
                                                                                <ContextMenuContent>
                                                                                    <ContextMenuItem onClick={() => handleFocusNow(task.id)}><CornerUpLeft className="mr-2 h-4 w-4" /> Focus Now</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}><FileText className="mr-2 h-4 w-4" /> Duplicate</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                    <ContextMenuItem onClick={() => handleMakeNext(task.id)}><ArrowUpCircle className="mr-2 h-4 w-4" /> Make Next</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleDump(task.id)}><Archive className="mr-2 h-4 w-4" /> Send to Idea Dump</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleArchive(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                    <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                                                </ContextMenuContent>
                                                                            </ContextMenu>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            });
                                                        })()
                                                    ) : (
                                                        // Priority Grouping logic
                                                        (() => {
                                                            const groups: Record<string, Task[]> = {
                                                                'high': [], 'medium': [], 'low': []
                                                            };

                                                            // Group by priority
                                                            activeTasks.forEach(t => {
                                                                if (t.isFrog) {
                                                                    groups['high'].push(t);
                                                                } else {
                                                                    groups[t.priority].push(t);
                                                                }
                                                            });

                                                            const groupOrder = ['high', 'medium', 'low'];

                                                            return groupOrder.map(groupName => {
                                                                const tasks = groups[groupName];
                                                                if (tasks.length === 0) return null;

                                                                // Sub-sort by Date within priority group
                                                                const sortedTasks = [...tasks].sort((a, b) => {
                                                                    if (a.isFrog) return -1;
                                                                    if (b.isFrog) return 1;
                                                                    if (!a.dueDate) return 1;
                                                                    if (!b.dueDate) return -1;
                                                                    return a.dueDate - b.dueDate;
                                                                });

                                                                return (
                                                                    <div key={groupName} className="space-y-2">
                                                                        <h4 className={cn("text-[10px] uppercase font-bold tracking-wider mb-2",
                                                                            groupName === 'high' ? "text-amber-500" :
                                                                                groupName === 'medium' ? "text-muted-foreground" :
                                                                                    "text-blue-500"
                                                                        )}>{groupName} Priority</h4>

                                                                        {sortedTasks.map(task => (
                                                                            <ContextMenu key={task.id}>
                                                                                <ContextMenuTrigger
                                                                                    onDoubleClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        handleEdit(task);
                                                                                    }}
                                                                                >
                                                                                    <div className={cn("group bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all", task.isFrog && "border-l-4 border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20")}>
                                                                                        <div className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center">
                                                                                            <div className="flex items-center gap-2 mb-0.5 overflow-hidden w-full shrink-0">
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
                                                                                                <p className={cn(
                                                                                                    "text-sm font-medium truncate",
                                                                                                    task.id === currentActiveTask?.id && !task.isFrog && !task.isLightning && "text-primary font-bold",
                                                                                                    task.isFrog && "text-emerald-700 dark:text-emerald-400 font-bold",
                                                                                                    task.isFrog && (Date.now() - task.createdAt > 3 * 24 * 60 * 60 * 1000) && "text-base font-extrabold text-red-600 dark:text-red-400",
                                                                                                    task.isLightning && !task.isFrog && "text-yellow-700 dark:text-yellow-400 font-bold"
                                                                                                )}>
                                                                                                    <FormattedText text={task.title} />
                                                                                                </p>
                                                                                                {task.isFrog && <span className="text-sm leading-none shrink-0">🐸</span>}
                                                                                                {task.isLightning && !task.isFrog && <span className="text-sm leading-none shrink-0">⚡️</span>}
                                                                                            </div>
                                                                                            {task.description && (
                                                                                                <Tooltip>
                                                                                                    <TooltipTrigger asChild>
                                                                                                        <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-0.5 max-w-[90%]">
                                                                                                            {task.description}
                                                                                                        </p>
                                                                                                    </TooltipTrigger>
                                                                                                    <TooltipContent side="bottom" align="start" className="max-w-[300px]">
                                                                                                        <FormattedText text={task.description} className="text-xs" />
                                                                                                    </TooltipContent>
                                                                                                </Tooltip>
                                                                                            )}
                                                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                                                {task.dueDate && <span className={cn("flex items-center gap-1", isPast(task.dueDate) && !isToday(task.dueDate) && "text-red-500 font-bold")}><Calendar className="h-3 w-3" />{format(task.dueDate, 'MMM d')}</span>}
                                                                                                {task.recurrence && <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}><Repeat className="h-3 w-3" /></span>}
                                                                                                {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                                                {task.priority === 'low' && <ArrowUpDown className="h-3 w-3 text-blue-500" />}
                                                                                            </div>
                                                                                        </div>
                                                                                        {task.id === currentActiveTask?.id && <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Now</span>}
                                                                                        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                                            <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }} title="Complete Task"><CheckCircle2 className="h-3 w-3" /></Button>
                                                                                            <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDump(task.id); }} title="Send to Idea Dump"><Lightbulb className="h-3 w-3" /></Button>
                                                                                            <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleArchive(task.id); }} title="Archive Task"><Archive className="h-3 w-3" /></Button>
                                                                                            <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                                                        </div>
                                                                                    </div>
                                                                                </ContextMenuTrigger>
                                                                                <ContextMenuContent>
                                                                                    <ContextMenuItem onClick={() => handleFocusNow(task.id)}><CornerUpLeft className="mr-2 h-4 w-4" /> Focus Now</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}><FileText className="mr-2 h-4 w-4" /> Duplicate</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                    <ContextMenuItem onClick={() => handleMakeNext(task.id)}><ArrowUpCircle className="mr-2 h-4 w-4" /> Make Next</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleDump(task.id)}><Archive className="mr-2 h-4 w-4" /> Send to Idea Dump</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleArchive(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                    <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                                                </ContextMenuContent>
                                                                            </ContextMenu>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            });
                                                        })()
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Idea Dump / Drafts */}
                            {mode === 'drafts' && (
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-6" ref={draftsRef}>
                                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between shrink-0">
                                        Idea Dump (Drafts)
                                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{draftTasks.length}</span>
                                    </h3>

                                    {/* Quick Add Input for Drafts */}
                                    <div className="mb-4 relative">
                                        <Input
                                            value={quickAddValue}
                                            onChange={(e) => setQuickAddValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const finalTitle = quickAddValue.replace(/\u200B/g, '').trim();
                                                    if (!finalTitle) return;

                                                    const { projects } = useMonocleStore.getState();
                                                    const parsedResult = parseTaskInput(quickAddValue, projects);

                                                    const newTask: Task = {
                                                        id: crypto.randomUUID(),
                                                        title: finalTitle, // Clean title even for ideas? Yes.
                                                        status: 'todo',
                                                        priority: parsedResult.priority || 'medium',
                                                        projectId: parsedResult.projectId || activeProject || undefined,
                                                        dueDate: parsedResult.dueDate, // Yes, ideas can have dates too
                                                        recurrence: parsedResult.recurrence,
                                                        duration: parsedResult.duration,
                                                        isFrog: parsedResult.isFrog,
                                                        isLightning: parsedResult.isLightning,
                                                        isDraft: true, // Always draft in this mode
                                                        createdAt: Date.now(),
                                                    };
                                                    useMonocleStore.getState().addTask(newTask);
                                                    setQuickAddValue('');
                                                    if (activeProject) setQuickAddProjectId(null);
                                                    toast("Added to Idea Dump", { description: newTask.title });
                                                }
                                            }}
                                            placeholder="Add an idea..."
                                            className="bg-card border-dashed border-2 shadow-none focus-visible:ring-0 focus-visible:border-primary/50"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] text-muted-foreground pointer-events-none opacity-50">
                                            <span>⏎ Add</span>
                                        </div>
                                    </div>


                                    <div className="flex-1 min-h-0">
                                        <div className="h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden pt-1 pb-32 -mx-4 px-4">
                                            <Droppable droppableId="drafts">
                                                {(provided) => (
                                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 pb-4">
                                                        {draftTasks.length === 0 && (
                                                            <div className="text-center py-8 text-muted-foreground/50 italic text-sm border-2 border-dashed rounded-xl">
                                                                {activeProject ? `No ideas in ${projects.find(p => p.id === activeProject)?.name || 'this project'}.` : "No tasks yet. Dump your brain here."}
                                                            </div>
                                                        )}
                                                        {draftTasks.map((task, index) => (
                                                            <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!!searchQuery}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            left: "auto",
                                                                            top: "auto"
                                                                        }}
                                                                        className={cn("w-full outline-none", snapshot.isDragging ? "z-50" : "")}
                                                                    >
                                                                        <SwipeableTask
                                                                            task={task}
                                                                            isMobile={isBelowMd}
                                                                            leftAction={(id) => handlePromote(id)}
                                                                            rightAction={(id) => handleDelete(id)}
                                                                            onTap={(task) => handleEdit(task)}
                                                                            leftIcon={ArrowUpCircle}
                                                                            leftLabel="Promote to Queue"
                                                                            leftBgClass="bg-yellow-500"
                                                                            leftColorClass="text-yellow-600"
                                                                            rightIcon={Trash2}
                                                                            rightLabel="Delete"
                                                                            rightBgClass="bg-red-500"
                                                                            rightColorClass="text-red-600"
                                                                        >
                                                                            <div
                                                                                {...provided.dragHandleProps}
                                                                                className="group outline-none touch-none"
                                                                            >
                                                                                <ContextMenu>
                                                                                    <ContextMenuTrigger
                                                                                        className={cn(
                                                                                            "block bg-muted/40 border-2 border-dashed border-transparent hover:border-muted-foreground/20 rounded-lg p-3 flex items-center gap-3 opacity-70 hover:opacity-100 transition-all font-mono cursor-pointer pointer-events-auto",
                                                                                            snapshot.isDragging && "opacity-50 ring-2 ring-primary ring-offset-2 z-50 bg-background"
                                                                                        )}>
                                                                                        <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                                                                        {(() => {
                                                                                            const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                            if (!proj) return null;
                                                                                            const IconCmp = getIconComponent(proj.icon);
                                                                                            return (
                                                                                                <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: proj.color }}>
                                                                                                    <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                        <span className="text-sm truncate flex-1">{task.title}</span>
                                                                                        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleDump(task.id);
                                                                                                }}
                                                                                                title="Send to Idea Dump"
                                                                                            >
                                                                                                <Lightbulb className="h-3 w-3" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleArchive(task.id);
                                                                                                }}
                                                                                                title="Archive Task"
                                                                                            >
                                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon-xs"
                                                                                                className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full"
                                                                                                type="button"
                                                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleEdit(task);
                                                                                                }}
                                                                                                title="Edit Task"
                                                                                            >
                                                                                                <Edit2 className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </ContextMenuTrigger>
                                                                                    <ContextMenuContent>
                                                                                        <ContextMenuItem onClick={() => handleFocusNow(task.id)}><CornerUpLeft className="mr-2 h-4 w-4" /> Promote to Focus</ContextMenuItem>
                                                                                        <ContextMenuItem onClick={() => handleMakeNext(task.id)}><ArrowUpCircle className="mr-2 h-4 w-4" /> Promote to Queue</ContextMenuItem>
                                                                                        <ContextMenuSeparator />
                                                                                        <ContextMenuItem onClick={() => handleEdit(task)}>
                                                                                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                                                                                        </ContextMenuItem>
                                                                                        <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}>
                                                                                            <FileText className="mr-2 h-4 w-4" /> Duplicate
                                                                                        </ContextMenuItem>
                                                                                        <ContextMenuSeparator />
                                                                                        <ContextMenuItem onClick={() => handleArchive(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                                        <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                                                    </ContextMenuContent>
                                                                                </ContextMenu>
                                                                            </div>
                                                                        </SwipeableTask>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </DragDropContext>
                    <AddTaskModal
                        taskToEdit={editingTask}
                        open={editModalOpen}
                        onOpenChange={setEditModalOpen}
                    />
                    <ConfirmationDialog
                        open={deleteConfirmOpen}
                        onOpenChange={setDeleteConfirmOpen}
                        title="Delete Task"
                        description="Are you sure you want to delete this task? It will be moved to the trash but can be undone immediately."
                        confirmLabel="Delete"
                        variant="destructive"
                        onConfirm={confirmDelete}
                    />

                    {/* Snooze Duration Prompt */}
                    <Dialog open={!!pendingSnoozeTask} onOpenChange={(open) => !open && setPendingSnoozeTask(null)}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Hold Task</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-4">
                                <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={() => handleSnoozeDrop(30, "30 minutes")}>
                                    <Moon className="h-5 w-5" />
                                    30 mins
                                </Button>
                                <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={() => handleSnoozeDrop(60, "1 hour")}>
                                    <Moon className="h-5 w-5" />
                                    1 hour
                                </Button>
                                <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={() => handleSnoozeDrop(240, "4 hours")}>
                                    <Moon className="h-5 w-5" />
                                    4 hours
                                </Button>
                                <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" onClick={() => handleSnoozeDrop(24 * 60, "Tomorrow")}>
                                    <Moon className="h-5 w-5" />
                                    Tomorrow
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </TooltipProvider>

            {/* Render AlertDialog for Multi-line Paste outside the scrolling area */}
            <AlertDialog open={!!pendingPaste} onOpenChange={(open) => !open && setPendingPaste(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create {pendingPaste?.length} items?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You pasted multiple lines. Do you want to create a separate {mode === 'drafts' ? 'idea' : 'task'} for each line?
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
                                handleBatchAdd(pendingPaste, mode === 'drafts');
                            }
                        }}>
                            Create {mode === 'drafts' ? 'Ideas' : 'Tasks'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export function QueueView({ customTrigger, defaultTab = 'active', variant = 'sheet', mode = 'active' }: QueueViewProps & { variant?: 'sheet' | 'fullscreen', mode?: 'active' | 'drafts' }) {
    const { activeSheet, setOpenSheet } = useMonocleStore();

    // Derived open state for the Sheet (only used when variant === 'sheet')
    const sheetOpen = variant === 'sheet' && activeSheet === 'queue';

    if (variant === 'fullscreen') {
        return <QueueContent defaultTab={defaultTab} variant="fullscreen" mode={mode} />;
    }

    return (
        <Sheet open={sheetOpen} onOpenChange={(val) => setOpenSheet(val ? 'queue' : null)}>
            {customTrigger && <SheetTrigger asChild>{customTrigger}</SheetTrigger>}
            <SheetContent side="left" className="w-[85vw] sm:w-[500px] p-0 border-r-0 sm:border-r" showCloseButton={false}>
                <QueueContent defaultTab={defaultTab} variant="sheet" mode={mode} />
            </SheetContent>
        </Sheet>
    );
}
