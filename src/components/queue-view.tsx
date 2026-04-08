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
import { format, isPast, isToday, isTomorrow, isThisWeek, startOfDay } from 'date-fns';
import { getIconComponent } from '@/lib/icons';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// Imports update
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Search, CornerUpLeft, ArrowUpCircle, Archive, Trash2, FileText, Edit2, Moon, Lightbulb, CornerDownLeft, AlertCircle, ListFilter, ArrowRightLeft, Eye, EyeOff, Hourglass, RefreshCw, Image as ImageIcon, Battery, BatteryMedium, Split } from 'lucide-react';
import { toast } from "sonner";
import { AddTaskModal } from './add-task-modal';
import { ProjectSelect } from './project-select';
import { HabitsWidget } from './habits-widget';
import { parseTaskInput, ParsedToken } from '@/lib/smart-parser';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SwipeableTask } from '@/components/ui/swipeable-task';
import { FormattedText } from './ui/formatted-text';
import { SubdivideTaskModal } from './subdivide-task-modal';
import { soundEngine } from '@/lib/sound-engine';
import { ReviewRitual } from '@/components/review-ritual';
import { ShutdownRitual } from '@/components/shutdown-ritual';
import { Clock } from 'lucide-react';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from '@/components/mentions-list';
import { Plus, ArrowUpToLine } from 'lucide-react';
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
                case 'waiting': colorClass = "bg-slate-500/20 text-transparent"; break;
                case 'habit': colorClass = "bg-orange-500/20 text-transparent"; break;
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

function TaskAgingBadges({ task }: { task: Task }) {
    const badges = [];
    const now = Date.now();
    const daysOld = Math.floor((now - task.createdAt) / 86400000);
    const daysHeld = task.status === 'waiting' ? Math.floor((now - (task.updatedAt || task.createdAt)) / 86400000) : 0;
    
    if (task.friction && task.friction.skips >= 3) {
        badges.push(<span key="skipped" className="flex items-center gap-1 text-orange-500/80 font-semibold bg-orange-500/10 px-1 rounded-sm" title="Skipped repeatedly">Skipped {task.friction.skips}x</span>);
    }
    if (task.status === 'waiting' && daysHeld >= 2) {
        badges.push(<span key="held" className="flex items-center gap-1 text-slate-500/80 font-semibold bg-slate-500/10 px-1 rounded-sm">Held {daysHeld}d</span>);
    }
    
    // Stale: older than 14 days, NOT in waiting, NOT a frog, NO launch date
    if (task.status === 'todo' && daysOld >= 14 && !task.launchDate && !task.isFrog && (!task.friction || (task.friction.skips === 0 && task.friction.holds === 0))) {
        badges.push(<span key="stale" className="flex items-center gap-1 text-red-500/80 font-semibold bg-red-500/10 px-1 rounded-sm">Stale</span>);
    }
    
    if (badges.length === 0) return null;
    return <>{badges}</>;
}

export interface QueueViewProps {
    customTrigger?: ReactNode;
    defaultTab?: 'active' | 'drafts';
    variant?: 'sheet' | 'fullscreen' | 'sidebar';
}

function QueueContent({ defaultTab, variant = 'sheet' }: { defaultTab?: 'active' | 'drafts', variant?: 'sheet' | 'fullscreen' | 'sidebar' }) {
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
        setView,
        lastReviewDate,
        lastShutdownDate
    } = useMonocleStore();
    const draftsRef = useRef<HTMLDivElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isLowEnergy, setIsLowEnergy] = useState(false);
    const [quickAddValue, setQuickAddValue] = useState('');
    const [quickAddProjectId, setQuickAddProjectId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Initialize sortMode from settings
    const [sortMode, setSortMode] = useState<'manual' | 'date' | 'priority'>(settings.sortMode);

    // Multi-task paste state
    const [pendingPaste, setPendingPaste] = useState<string[] | null>(null);

    // Ritual State
    const [reviewOpen, setReviewOpen] = useState(false);
    const [shutdownOpen, setShutdownOpen] = useState(false);

    // Auto-refresh interval so "On Hold" tasks and rituals natively pop back into the list
    const [renderTick, setRenderTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setRenderTick(prev => prev + 1);
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const needsReviewPulse = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        if (lastReviewDate === today) return false; // Already done today

        const currentHour = new Date().getHours();
        if (currentHour >= 16) return false; // After 4 PM, no more morning reviews

        const hasFrog = tasks.some(t => t.isFrog && t.status === 'todo');
        const staleCount = tasks.filter(t => t.status === 'todo' && !t.isOngoing && !t.launchDate && Math.floor((Date.now() - t.createdAt)/86400000) >= 14).length;
        return !hasFrog || staleCount > 3;
    }, [tasks, renderTick, lastReviewDate]); // renderTick safely updates this when hours change

    const needsShutdownPulse = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        if (lastShutdownDate === today) return false; // Already done today

        const currentHour = new Date().getHours();
        return currentHour >= 16; // Highlight after 4 PM local time
    }, [renderTick, lastShutdownDate]);

    // Derived state for open/close based on variant
    // If fullscreen/sidebar, we are always "open" in context of this component rendering
    // If sheet, we use activeSheet
    const open = variant === 'fullscreen' || variant === 'sidebar' || activeSheet === 'queue';

    // Edit State
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [taskToSubdivide, setTaskToSubdivide] = useState<Task | null>(null);

    // Determine if this specific QueueView component is actually visible to the user
    // This prevents background variants (like the hidden Sheet) from rendering portals (like Tooltips)
    const isVisible = (variant === 'fullscreen' || variant === 'sidebar') ? true : activeSheet === 'queue';

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    // Snooze Drag State
    const [pendingSnoozeTask, setPendingSnoozeTask] = useState<Task | null>(null);

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
            const isDraft = e.shiftKey;
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
    const matchesSearch = (t: Task) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        if (t.title.toLowerCase().includes(query)) return true;
        if (t.description?.toLowerCase().includes(query)) return true;
        if (t.projectId) {
            const project = projects.find(p => p.id === t.projectId);
            if (project && project.name.toLowerCase().includes(query)) return true;
        }
        return false;
    };

    // Evaluate pure time before render loops
    const now = Date.now();
    const todayStart = startOfDay(now).getTime();

    let ongoingTasks = visibleTasks.filter(t => 
        t.isOngoing && 
        !t.isDraft && 
        t.status !== 'done' && 
        t.status !== 'waiting' && 
        matchesSearch(t)
    );

    let activeTasks = visibleTasks.filter(t => {
        if (t.isOngoing) return false;
        if (t.isDraft || t.status === 'done' || t.status === 'waiting') return false;
        if (t.skippedUntil && t.skippedUntil > now) return false;
        if (t.launchDate && startOfDay(t.launchDate).getTime() > todayStart) return false;
        if (!matchesSearch(t)) return false;
        
        if (isLowEnergy && !t.isFrog) {
            const isEasy = t.isLightning || t.priority === 'low' || (t.duration && t.duration <= 15);
            if (!isEasy) return false;
        }
        
        return true;
    });

    let dormantTasks = visibleTasks.filter(t => 
        !t.isOngoing &&
        !t.isDraft && 
        t.status !== 'done' && 
        t.status !== 'waiting' && 
        (!t.skippedUntil || t.skippedUntil <= now) && 
        (t.launchDate && startOfDay(t.launchDate).getTime() > todayStart) && 
        matchesSearch(t)
    ).sort((a, b) => (a.launchDate || 0) - (b.launchDate || 0));

    // Mathematically pin the Daily Frog to the absolute top of the Active Tasks queue
    const activeFrogIndex = activeTasks.findIndex(t => t.isFrog);
    if (activeFrogIndex > 0) {
        const frog = activeTasks[activeFrogIndex];
        activeTasks.splice(activeFrogIndex, 1);
        activeTasks.unshift(frog);
    }

    // Bubbling up Due tasks directly under the Frog (when in manual mode)
    if (sortMode === 'manual' && !searchQuery) {
        const dueTasks = [];
        const normalTasks = [];
        const hasFrog = activeTasks.length > 0 && activeTasks[0].isFrog;
        const startIndex = hasFrog ? 1 : 0;
        const frogArr = hasFrog ? [activeTasks[0]] : [];

        for (let i = startIndex; i < activeTasks.length; i++) {
            const t = activeTasks[i];
            // Any active task with a launchDate is by definition "Due" (or overdue) because future tasks are filtered out
            if (t.launchDate) {
                dueTasks.push(t);
            } else {
                normalTasks.push(t);
            }
        }
        // Due tasks sorted by oldest due date first
        dueTasks.sort((a, b) => (a.launchDate || 0) - (b.launchDate || 0));

        activeTasks = [...frogArr, ...dueTasks, ...normalTasks];
    }

    let snoozedTasks = visibleTasks.filter(t => !t.isDraft && t.status !== 'done' && t.status !== 'waiting' && (t.skippedUntil && t.skippedUntil > now) && matchesSearch(t));
    let waitingTasks = visibleTasks.filter(t => !t.isDraft && t.status === 'waiting' && matchesSearch(t)).sort((a,b) => {
        if (a.isBlocked === b.isBlocked) return 0;
        return a.isBlocked ? -1 : 1;
    });
    let draftTasks = visibleTasks.filter(t => t.isDraft && t.status !== 'done' && matchesSearch(t));

    if (searchQuery) {
        activeTasks = [
            ...activeTasks,
            ...dormantTasks,
            ...snoozedTasks,
            ...waitingTasks,
            ...draftTasks
        ].sort((a, b) => b.createdAt - a.createdAt);

        dormantTasks = [];
        snoozedTasks = [];
        waitingTasks = [];
        draftTasks = [];
    }

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

        // Intercept drop into Waiting On
        if (result.destination.droppableId === 'waiting') {
            if (draggedTask) {
                useMonocleStore.getState().updateTask(draggedTask.id, { status: 'waiting' });
                toast.success("Moved to Waiting On");
            }
            return;
        }

        // Remove automatic interception for 'drafts' so the drag can re-index into the Accordion list
        // Update: We actually still want to allow dropping into the empty droppable or the list. 
        // The list handles it just fine because we defined destination properly.

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

        // Now reconstruct the GLOBAL state without altering the order of uninvolved tasks
        const involvedIds = new Set([...activeTasks.map(t => t.id), ...draftTasks.map(t => t.id)]);

        let finalActive = result.destination.droppableId === 'active' ? newDest : (result.source.droppableId === 'active' ? newSource : activeTasks);
        let finalDrafts = result.destination.droppableId === 'drafts' ? newDest : (result.source.droppableId === 'drafts' ? newSource : draftTasks);

        const newInvolved = [...finalActive, ...finalDrafts];

        // Find the global indices where these involved tasks currently sit
        const originalIndices: number[] = [];
        tasks.forEach((t, i) => {
            if (involvedIds.has(t.id)) originalIndices.push(i);
        });

        // Slot the reordered tasks back into their original global footprint
        if (originalIndices.length === newInvolved.length) {
            const newTasks = [...tasks];
            for (let i = 0; i < originalIndices.length; i++) {
                newTasks[originalIndices[i]] = newInvolved[i];
            }
            setTask(newTasks);
        } else {
            // Fallback (should never be reached unless state desyncs)
            const uninvolvedTasks = tasks.filter(t => !involvedIds.has(t.id));
            setTask([...finalActive, ...finalDrafts, ...uninvolvedTasks]);
        }
    };

    const handleSnoozeDrop = (durationMinutes: number, label: string) => {
        if (pendingSnoozeTask) {
            snoozeTask(durationMinutes, pendingSnoozeTask.id);
            toast("Task on hold", {
                description: `Held for ${label}`,
                duration: 12000, action: { label: "Undo", onClick: () => undo() }
            });
            setPendingSnoozeTask(null);
        }
    };

    const handleQuickAdd = (isDraft: boolean = false) => {
        const finalTitle = quickAddValue.replace(/\u200B/g, '').trim();
        if (!finalTitle) return;

        const { projects, addHabit, addTask } = useMonocleStore.getState();
        const parsedResult = parseTaskInput(quickAddValue, projects);

        if (parsedResult.isHabit) {
            addHabit({
                id: generateId(),
                title: parsedResult.title || finalTitle,
                streak: 0,
                createdAt: Date.now(),
                daysOfWeek: parsedResult.daysOfWeek
            });
            setQuickAddValue('');
            setQuickAddProjectId(null);
            toast.success("Habit Created", { description: parsedResult.title || finalTitle });
            return;
        }

        const finalIsDraft = isDraft || parsedResult.isIdea;

        const newTask: Task = {
            id: generateId(),
            title: parsedResult.title || finalTitle,
            description: '',
            status: parsedResult.isWaiting ? 'waiting' : 'todo',
            priority: parsedResult.priority || 'medium',
            projectId: quickAddProjectId || parsedResult.projectId || activeProject || undefined,
            launchDate: parsedResult.launchDate,
            recurrence: parsedResult.recurrence,
            duration: parsedResult.duration,
            isFrog: parsedResult.isFrog,
            isLightning: parsedResult.isLightning,
            isDraft: finalIsDraft,
            createdAt: Date.now(),
        };
        addTask(newTask);
        setQuickAddValue('');
        setQuickAddProjectId(null);
        toast(finalIsDraft ? "Added to Idea Dump" : "Added to Queue", { description: newTask.title });
    };

    const handleBatchAdd = (lines: string[], isDraft: boolean) => {
        const { projects, addTask, addHabit } = useMonocleStore.getState();
        let count = 0;

        lines.forEach(line => {
            const trimmed = line.replace(/\u200B/g, '').trim();
            if (!trimmed) return;

            const parsedResult = parseTaskInput(line, projects);

            if (parsedResult.isHabit) {
                addHabit({
                    id: generateId(),
                    title: parsedResult.title || trimmed,
                    streak: 0,
                    createdAt: Date.now()
                });
                count++;
                return;
            }

            const finalIsDraft = isDraft || parsedResult.isIdea;

            const newTask: Task = {
                id: generateId(),
                title: parsedResult.title || trimmed,
                description: '',
                status: parsedResult.isWaiting ? 'waiting' : 'todo',
                priority: parsedResult.priority || 'medium',
                projectId: parsedResult.projectId || activeProject || undefined,
                launchDate: parsedResult.launchDate,
                recurrence: parsedResult.recurrence,
                duration: parsedResult.duration,
                isFrog: parsedResult.isFrog,
                isLightning: parsedResult.isLightning,
                isDraft: finalIsDraft,
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
            duration: 12000, action: { label: "Undo", onClick: () => undo() }
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
                duration: 12000, action: { label: "Undo", onClick: () => undo() }
            });
            setTaskToDelete(null);
            setDeleteConfirmOpen(false);
        }
    };

    const handleArchive = (taskId: string) => {
        const result = archiveTask(taskId);

        if (result?.nextTask) {
            toast("Recurring task archived", {
                description: `Next instance scheduled for ${format(result.nextTask.launchDate || Date.now(), 'MMM d')}`,
                duration: 12000, action: { label: "Undo", onClick: () => undo() }
            });
        } else {
            toast("Task archived", {
                duration: 12000, action: { label: "Undo", onClick: () => undo() }
            });
        }
    };

    const handleSkip = (taskId: string) => {
        const taskToSkip = tasks.find(t => t.id === taskId);
        if (taskToSkip) {
            useMonocleStore.getState().skipTask(taskId);
            toast("Task passed", {
                description: taskToSkip.isFrog ? "The Frog Will Return...SOON." : "Moved to bottom of Queue",
                duration: 12000, action: { label: "Undo", onClick: () => useMonocleStore.getState().undo() }
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
        soundEngine.playComplete();

        if (result?.nextTask) {
            toast("Recurring task completed", {
                description: `Next instance scheduled for ${format(result.nextTask.launchDate || Date.now(), 'MMM d')}`,
                duration: 12000, action: { label: "Undo", onClick: () => undo() }
            });
        } else {
            toast("Task completed", {
                duration: 12000, action: { label: "Undo", onClick: () => undo() }
            });
        }
    };
    const parsedQuickAddResult = quickAddValue ? parseTaskInput(quickAddValue, projects) : null;

    return (
        <>
            <SubdivideTaskModal 
                open={!!taskToSubdivide} 
                onOpenChange={(val) => !val && setTaskToSubdivide(null)} 
                task={taskToSubdivide} 
            />
            <TooltipProvider>
                <div
                    className={cn(
                        "flex flex-col h-full bg-background/95 backdrop-blur p-0 gap-0", 
                        variant === 'fullscreen' ? "w-full max-w-3xl mx-auto md:border-x shadow-2xl h-[95vh] md:rounded-xl md:my-4" : 
                        variant === 'sidebar' ? "w-full h-full pb-20 sm:pb-0 relative" : ""
                    )}
                    onTouchStart={handleQueueTouchStart}
                    onTouchEnd={handleQueueTouchEnd}
                >
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b flex flex-row items-center justify-between gap-3 shrink-0">
                        <div className="text-xl sm:text-2xl font-bold flex items-center gap-2 rounded-md px-1 -ml-1 text-left">
                            <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                            <span>Queue</span>
                            {activeProject && <span className="text-sm font-normal text-muted-foreground ml-1">(Filtered)</span>}
                        </div>

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
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsLowEnergy(!isLowEnergy)}
                                                className={cn("px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 shadow-sm ring-1", isLowEnergy ? "bg-amber-500/10 text-amber-600 ring-amber-500/50" : "bg-background text-foreground ring-black/5 hover:bg-muted")}
                                                title="Filter to easy wins"
                                            >
                                                {isLowEnergy ? <Battery className="h-3.5 w-3.5" /> : <BatteryMedium className="h-3.5 w-3.5" />}
                                                <span className="hidden sm:inline">Brain Fried</span>
                                                <span className="sm:hidden">Fried</span>
                                            </button>
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
                                                        placeholder={isBelowMd ? "Add a task..." : "Add a task... (Enter = save, Shift+Enter = draft)"}
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

                                                {/* Meta Chips */}
                                                {(quickAddProjectId || parsedQuickAddResult?.launchDate || parsedQuickAddResult?.priority || parsedQuickAddResult?.projectId || parsedQuickAddResult?.recurrence || parsedQuickAddResult?.isFrog || parsedQuickAddResult?.isLightning || parsedQuickAddResult?.isWaiting || parsedQuickAddResult?.isIdea || parsedQuickAddResult?.isHabit) && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-2 pointer-events-none animate-in fade-in slide-in-from-top-1">
                                                        {(quickAddProjectId || parsedQuickAddResult?.projectId) && (() => {
                                                            const activeId = parsedQuickAddResult?.projectId || quickAddProjectId;
                                                            const p = projects.find(proj => proj.id === activeId);
                                                            if (!p) return null;
                                                            const IconCmp = getIconComponent(p.icon);
                                                            return (
                                                                <span className="text-[10.5px] font-semibold px-2 py-[3px] rounded items-center gap-1.5 text-white shadow-sm inline-flex shrink-0" style={{ backgroundColor: p.color }}>
                                                                    <IconCmp className="w-3 h-3 drop-shadow-sm" /> {p.name}
                                                                </span>
                                                            );
                                                        })()}
                                                        {parsedQuickAddResult?.launchDate && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center gap-1.5 backdrop-blur-md shrink-0 border border-indigo-500/20">
                                                                <Calendar className="w-3 h-3" /> {format(parsedQuickAddResult.launchDate, 'MMM d')}
                                                            </span>
                                                        )}
                                                        {parsedQuickAddResult?.priority && parsedQuickAddResult.priority !== 'medium' && (
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 backdrop-blur-md shrink-0 border",
                                                                parsedQuickAddResult.priority === 'high' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                            )}>
                                                                <AlertCircle className="w-3 h-3" /> {parsedQuickAddResult.priority.toUpperCase()}
                                                            </span>
                                                        )}
                                                        {parsedQuickAddResult?.isFrog && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 backdrop-blur-md shrink-0 border border-emerald-500/20">
                                                                <span>🐸</span> FROG
                                                            </span>
                                                        )}
                                                        {parsedQuickAddResult?.isLightning && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 backdrop-blur-md shrink-0 border border-amber-500/20">
                                                                <span>⚡️</span> FAST
                                                            </span>
                                                        )}
                                                        {parsedQuickAddResult?.isIdea && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1.5 backdrop-blur-md shrink-0 border border-purple-500/20">
                                                                <Lightbulb className="w-3 h-3" /> IDEA
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 min-h-0">
                                        <div className="h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden pt-1 pb-32 -mx-4 px-4">
                                            <HabitsWidget />
                                            
                                            {/* Ritual Inline Banners */}
                                            <ReviewRitual open={reviewOpen} onOpenChange={setReviewOpen} />
                                            <ShutdownRitual open={shutdownOpen} onOpenChange={setShutdownOpen} />
                                            
                                            {!searchQuery && needsReviewPulse && (
                                                <div 
                                                    onClick={() => setReviewOpen(true)}
                                                    className="mb-4 mt-2 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:from-primary/15 transition-all group animate-in slide-in-from-top-2"
                                                >
                                                    <div>
                                                        <h3 className="font-bold text-primary flex items-center gap-2"><Clock className="w-4 h-4" /> Plan The Day</h3>
                                                        <p className="text-sm opacity-80 mt-1">You have {activeTasks.length} active tasks on the board. Let's organize them.</p>
                                                    </div>
                                                    <Button size="sm" className="shrink-0 shadow-sm" onClick={(e) => { e.stopPropagation(); setReviewOpen(true); }}>
                                                        Start Review
                                                    </Button>
                                                </div>
                                            )}

                                            {!searchQuery && needsShutdownPulse && !needsReviewPulse && (
                                                <div 
                                                    onClick={() => setShutdownOpen(true)}
                                                    className="mb-4 mt-2 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:from-indigo-500/15 transition-all group animate-in slide-in-from-top-2"
                                                >
                                                    <div>
                                                        <h3 className="font-bold text-indigo-500 flex items-center gap-2"><Moon className="w-4 h-4" /> Evening Shutdown</h3>
                                                        <p className="text-sm opacity-80 mt-1">The day is ending. Close out your open loops and dump ideas.</p>
                                                    </div>
                                                    <Button size="sm" variant="secondary" className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 shrink-0 shadow-sm" onClick={(e) => { e.stopPropagation(); setShutdownOpen(true); }}>
                                                        Run Shutdown
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {ongoingTasks.length > 0 && (
                                                <div className="mb-6 space-y-2">
                                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-500/70 ml-1 flex items-center gap-1.5"><span className="text-base leading-none">🌊</span> Ongoing Horizons</h3>
                                                    {ongoingTasks.map((task) => (
                                                        <div key={task.id} className="w-full relative group">
                                                            <SwipeableTask
                                                                task={task}
                                                                isMobile={isBelowMd}
                                                                leftAction={(id) => handleComplete(id)}
                                                                rightAction={(id) => {}}
                                                            >
                                                                <div className="bg-purple-500/5 hover:bg-purple-500/10 border-l-2 border-l-purple-500/50 rounded-lg rounded-l-none py-1.5 px-3 flex items-center gap-3 relative overflow-hidden transition-all shadow-sm">
                                                                    <ContextMenu>
                                                                        <ContextMenuTrigger className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center gap-0.5" onDoubleClick={(e) => { e.preventDefault(); handleEdit(task); }}>
                                                                            <div className="flex items-center gap-2">
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
                                                                                <p className="text-sm font-medium truncate text-purple-800 dark:text-purple-300">
                                                                                    <FormattedText text={task.title} />
                                                                                </p>
                                                                            </div>
                                                                            {task.description && (
                                                                                <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-0.5 max-w-[80%]">
                                                                                    {task.description}
                                                                                </p>
                                                                            )}
                                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 mt-0.5">
                                                                                {(() => {
                                                                                    const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                    if (!proj) return null;
                                                                                    return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                                })()}
                                                                                {task.launchDate && <span className={cn("flex items-center gap-1", isPast(task.launchDate) && !isToday(task.launchDate) && "text-red-500/70 font-bold")}><Calendar className="h-3 w-3" />{format(task.launchDate, 'MMM d')}</span>}
                                                                                {task.recurrence && <span className="flex items-center gap-1 text-orange-500/60" title={`Repeats ${task.recurrence}`}><Repeat className="h-3 w-3" /></span>}
                                                                                {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1 text-muted-foreground/60" title="Has attachments"><ImageIcon className="h-3 w-3" /></span>}
                                                                                {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500/60" />}
                                                                                {task.priority === 'low' && <AlertCircle className="h-3 w-3 text-blue-500/60" />}
                                                                            </div>
                                                                        </ContextMenuTrigger>
                                                                        <ContextMenuContent>
                                                                            <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit notes</ContextMenuItem>
                                                                            <ContextMenuItem onClick={() => useMonocleStore.getState().toggleOngoing(task.id)}><span className="mr-2 text-sm leading-none">🌊</span> Remove from Ongoing</ContextMenuItem>
                                                                            <ContextMenuSeparator />
                                                                            <ContextMenuItem onClick={() => handleComplete(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Complete</ContextMenuItem>
                                                                            <ContextMenuItem onClick={() => handleArchive(task.id)}><Archive className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                        </ContextMenuContent>
                                                                    </ContextMenu>
                                                                    <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50 shrink-0">
                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full" onClick={() => handleComplete(task.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full" onClick={() => handleEdit(task)}><Edit2 className="h-3 w-3" /></Button>
                                                                    </div>
                                                                </div>
                                                            </SwipeableTask>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {sortMode === 'manual' && !searchQuery ? (
                                                <>
                                                    <Droppable droppableId="active">
                                                        {(provided) => (
                                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 pb-4 min-h-[50px]">
                                                                {activeTasks.length === 0 && (
                                                                    <div className="text-center py-12 px-6 text-emerald-500/80 text-sm border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-500">
                                                                        <CheckCircle2 className="h-10 w-10 opacity-50 mb-1" />
                                                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{activeProject ? `Project cleared.` : "Queue cleared. Go live your life."}</p>
                                                                        <p className="text-xs max-w-xs leading-relaxed opacity-80">{activeProject ? "You've finished everything tracked in this project." : "You have successfully executed everything on the board. Take a rest."}</p>
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
                                                                                                duration: 12000, action: { label: "Undo", onClick: () => useMonocleStore.getState().undo() }
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                        <div
                                                                                            className={cn(
                                                                                                "group bg-card border rounded-lg shadow-sm hover:shadow-md transition-all select-none outline-none flex items-center gap-3 py-2 px-3 relative overflow-hidden",
                                                                                                task.priority === 'high' && "bg-red-500/5 hover:bg-red-500/10",
                                                                                                task.launchDate && isToday(task.launchDate) && "border-l-4 border-l-primary",
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
                                                                                                    {(() => {
                                                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                                        if (!proj) return null;
                                                                                                        return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                                                    })()}
                                                                                                    {task.launchDate && (
                                                                                                        <span className={cn("flex items-center gap-1", isPast(task.launchDate) && !isToday(task.launchDate) && "text-red-500 font-bold")}>
                                                                                                            <Calendar className="h-3 w-3" />
                                                                                                            {format(task.launchDate, 'MMM d')}
                                                                                                        </span>
                                                                                                    )}
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
                                                                                                    {task.priority === 'high' && (
                                                                                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                                                                                    )}
                                                                                                    {task.priority === 'low' && (
                                                                                                        <AlertCircle className="h-3 w-3 text-blue-500" />
                                                                                                    )}
                                                                                                    {task.status === 'waiting' && !task.isBlocked && (
                                                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500">WAITING</span>
                                                                                                    )}
                                                                                                    {task.status === 'waiting' && task.isBlocked && (
                                                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600">🔗 BLOCKED</span>
                                                                                                    )}
                                                                                                    {task.isDraft && (
                                                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500">IDEA</span>
                                                                                                    )}
                                                                                                    {!task.isDraft && task.status !== 'waiting' && task.skippedUntil && task.skippedUntil > now && (
                                                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">HOLD</span>
                                                                                                    )}
                                                                                                    {!task.isDraft && task.status !== 'waiting' && (!task.skippedUntil || task.skippedUntil <= now) && (task.launchDate && startOfDay(task.launchDate).getTime() > todayStart) && (
                                                                                                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500">DORMANT</span>
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
                                                                                                <ContextMenuItem onClick={() => useMonocleStore.getState().toggleOngoing(task.id)}>
                                                                                                    <span className="mr-2 text-sm leading-none">🌊</span> {task.isOngoing ? 'Remove from Ongoing' : 'Mark as Ongoing'}
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
                                                                                                <ContextMenuItem onClick={() => useMonocleStore.getState().waitTask(task.id)}>
                                                                                                    <Hourglass className="mr-2 h-4 w-4" /> Mark as Waiting
                                                                                                </ContextMenuItem>
                                                                                                <ContextMenuItem onClick={() => useMonocleStore.getState().updateTask(task.id, { status: 'waiting', isBlocked: !task.isBlocked })}>
                                                                                                    <Hourglass className="mr-2 h-4 w-4" /> {task.isBlocked ? 'Unmark Blocked' : 'Mark as Blocked'}
                                                                                                </ContextMenuItem>
                                                                                                <ContextMenuSeparator />
                                                                                                <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive">
                                                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                                                </ContextMenuItem>
                                                                                            </ContextMenuContent>
                                                                                        </ContextMenu>

                                                                                        {/* Indicators and Actions */}
                                                                                        {task.id === currentActiveTask?.id && <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Now</span>}
                                                                                        <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
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
                                                                                                    useMonocleStore.getState().jumpTaskToTop(task.id);
                                                                                                }}
                                                                                                title="Jump to Top"
                                                                                            >
                                                                                                <ArrowUpToLine className="h-3 w-3" />
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

                                                    {/* Upcoming Section (Dormant Tasks) */}
                                                    {dormantTasks.length > 0 && (
                                                        <Accordion type="single" collapsible className="mt-8 transition-colors rounded-xl min-h-[50px]">
                                                            <AccordionItem value="upcoming" className="border-none">
                                                                <AccordionTrigger className="flex items-center gap-2 px-2 pt-2 mb-3 hover:no-underline py-0">
                                                                    <div className="flex items-center gap-2 flex-1 justify-start">
                                                                        <Calendar className="h-3 w-3 text-emerald-500/70" />
                                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 flex items-center gap-2 m-0">
                                                                            Upcoming (Dormant)
                                                                            <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded-full">{dormantTasks.length}</span>
                                                                        </h3>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="space-y-2 pb-4 pt-1">
                                                                    {dormantTasks.map((task) => (
                                                                        <ContextMenu key={task.id}>
                                                                            <ContextMenuTrigger onDoubleClick={(e) => { e.preventDefault(); handleEdit(task); }}>
                                                                                <div className={cn("group bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all opacity-70 hover:opacity-100 cursor-pointer")}>
                                                                                    <div className="flex-1 min-w-0 text-left cursor-default self-stretch flex flex-col justify-center">
                                                                                        <div className="flex items-center gap-2 mb-0.5 overflow-hidden w-full shrink-0">
                                                                                            <p className="text-sm font-medium truncate">
                                                                                                <FormattedText text={task.title} />
                                                                                            </p>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                                                    {(() => {
                                                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                                        if (!proj) return null;
                                                                                                        return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                                                    })()}
                                                                                            {task.launchDate && (
                                                                                                <span className={cn("flex items-center gap-1", isPast(task.launchDate) && !isToday(task.launchDate) && "text-red-500 font-bold")}>
                                                                                                    <Calendar className="h-3 w-3" />
                                                                                                    {format(task.launchDate, 'EEE, MMM d')}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
                                                                                        <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                                                    </div>
                                                                                </div>
                                                                            </ContextMenuTrigger>
                                                                                <ContextMenuContent>
                                                                                    <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().toggleOngoing(task.id)}><span className="mr-2 text-sm leading-none">🌊</span> Mark as Ongoing</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                                            </ContextMenuContent>
                                                                        </ContextMenu>
                                                                    ))}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    )}

                                                    {/* On Hold Section */}
                                                    <Accordion type="single" collapsible className={cn("w-full mt-4", snoozedTasks.length === 0 && "hidden")}>
                                                        <AccordionItem value="on-hold" className="border-none">
                                                            <Droppable droppableId="on-hold">
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        {...provided.droppableProps}
                                                                        ref={provided.innerRef}
                                                                        className={cn(
                                                                            "space-y-0 rounded-xl min-h-[50px] transition-colors",
                                                                            snapshot.isDraggingOver ? "bg-muted/50 ring-2 ring-primary/20 ring-inset" : ""
                                                                        )}
                                                                    >
                                                                        <AccordionTrigger className="hover:no-underline py-2 px-2 hover:bg-muted/50 rounded-lg transition-colors group">
                                                                            <div className="flex items-center gap-2">
                                                                                <Moon className="h-4 w-4 text-muted-foreground" />
                                                                                <h3 className="text-xs font-bold tracking-wide text-muted-foreground flex items-center gap-2">
                                                                                    On Hold
                                                                                    <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{snoozedTasks.length}</span>
                                                                                </h3>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="pt-2 px-1 pb-4 space-y-2">
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
                                                                                                    {(() => {
                                                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                                        if (!proj) return null;
                                                                                                        const IconCmp = getIconComponent(proj.icon);
                                                                                                        return (
                                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                                <div className="flex items-center justify-center shrink-0 w-3 h-3 rounded-[3px]" style={{ backgroundColor: proj.color }}>
                                                                                                                    <IconCmp className="h-[8px] w-[8px] text-white drop-shadow-sm" />
                                                                                                                </div>
                                                                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })()}
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
                                                                        </AccordionContent>
                                                                    </div>
                                                                )}
                                                            </Droppable>
                                                        </AccordionItem>
                                                    </Accordion>

                                                    {/* Waiting On Section */}
                                                    <Accordion type="single" collapsible className={cn("w-full mt-4", waitingTasks.length === 0 && "hidden")}>
                                                        <AccordionItem value="waiting-on" className="border-none">
                                                            <Droppable droppableId="waiting">
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        {...provided.droppableProps}
                                                                        ref={provided.innerRef}
                                                                        className={cn(
                                                                            "space-y-0 rounded-xl min-h-[50px] transition-colors",
                                                                            snapshot.isDraggingOver ? "bg-muted/50 ring-2 ring-primary/20 ring-inset" : ""
                                                                        )}
                                                                    >
                                                                        <AccordionTrigger className="hover:no-underline py-2 px-2 hover:bg-muted/50 rounded-lg transition-colors group">
                                                                            <div className="flex items-center gap-2">
                                                                                <Hourglass className={cn("h-4 w-4", waitingTasks.some(t => t.isBlocked) ? "text-orange-500" : "text-slate-500")} />
                                                                                <h3 className={cn("text-xs font-bold tracking-wide flex items-center gap-2", waitingTasks.some(t => t.isBlocked) ? "text-orange-600" : "text-slate-500")}>
                                                                                    Waiting On
                                                                                    <span className="bg-slate-500/10 px-1.5 py-0.5 rounded-full text-[10px] text-slate-500">{waitingTasks.length}</span>
                                                                                    {waitingTasks.some(t => t.isBlocked) && (
                                                                                        <span className="bg-orange-500/15 px-2 py-0.5 rounded-full text-[10px] text-orange-600 font-bold ml-1">
                                                                                            {waitingTasks.filter(t => t.isBlocked).length} Blocked 🔗
                                                                                        </span>
                                                                                    )}
                                                                                </h3>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="pt-2 px-1 pb-4 space-y-2">
                                                            {waitingTasks.map((task) => (
                                                                <ContextMenu key={task.id}>
                                                                    <ContextMenuTrigger
                                                                        onDoubleClick={(e) => {
                                                                            e.preventDefault();
                                                                            handleEdit(task);
                                                                        }}
                                                                    >
                                                                        <div className={cn("group bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all opacity-50 grayscale", task.isFrog && "border-l-4 border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20", task.isBlocked && "!opacity-100 !grayscale-0 bg-orange-500/5 border-orange-500/30 ring-1 ring-orange-500/10 hover:bg-orange-500/10")}>
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
                                                                                        "text-sm font-medium truncate text-slate-500",
                                                                                        task.isFrog && "text-emerald-700/70 dark:text-emerald-400/70 font-bold",
                                                                                        task.isLightning && !task.isFrog && "text-yellow-700/70 dark:text-yellow-400/70 font-bold"
                                                                                    )}>
                                                                                        <FormattedText text={task.title} />
                                                                                    </p>
                                                                                    {task.isFrog && <span className="text-sm leading-none shrink-0 opacity-70">🐸</span>}
                                                                                    {task.isLightning && !task.isFrog && <span className="text-sm leading-none shrink-0 opacity-70">⚡️</span>}
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
                                                                                                    {(() => {
                                                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                                        if (!proj) return null;
                                                                                                        return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                                                    })()}
                                                                                    <TaskAgingBadges task={task} /> {task.launchDate && <span className={cn("flex items-center gap-1", isPast(task.launchDate) && !isToday(task.launchDate) && "text-red-500 font-bold")}><Calendar className="h-3 w-3" />{format(task.launchDate, 'MMM d')}</span>}
                                                                                    {task.recurrence && <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}><Repeat className="h-3 w-3" /></span>}
                                                                                    {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1 text-muted-foreground/60" title="Has attachments"><ImageIcon className="h-3 w-3" /></span>}
                                                                                    {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                                    {task.priority === 'low' && <AlertCircle className="h-3 w-3 text-blue-500" />}
                                                                                </div>
                                                                            </div>
                                                                            <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
                                                                                {task.friction && task.friction.skips >= 3 && <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-orange-500 rounded-full relative text-orange-500/70" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setTaskToSubdivide(task); }} title="Slice Task"><Split className="h-3 w-3" /></Button>}
                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-slate-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); useMonocleStore.getState().updateTask(task.id, {status: 'todo'}); toast.success("Restored to Queue"); }} title="Restore to Active Queue"><RefreshCw className="h-3 w-3" /></Button>
                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-emerald-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleComplete(task.id); }} title="Complete Task"><CheckCircle2 className="h-3 w-3" /></Button>
                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-amber-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDump(task.id); }} title="Send to Idea Dump"><Lightbulb className="h-3 w-3" /></Button>
                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleArchive(task.id); }} title="Archive Task"><Archive className="h-3 w-3" /></Button>
                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                                            </div>
                                                                        </div>
                                                                    </ContextMenuTrigger>
                                                                    <ContextMenuContent>
                                                                        <ContextMenuItem onClick={() => {
                                                                            useMonocleStore.getState().updateTask(task.id, {status: 'todo'});
                                                                            toast.success("Restored to Queue");
                                                                        }}><RefreshCw className="mr-2 h-4 w-4" /> Restore to Queue</ContextMenuItem>
                                                                        <ContextMenuSeparator />
                                                                        <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                                        <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}><FileText className="mr-2 h-4 w-4" /> Duplicate</ContextMenuItem>
<ContextMenuItem onClick={() => setTaskToSubdivide(task)}><Split className="mr-2 h-4 w-4" /> Subdivide</ContextMenuItem>
                                                                        <ContextMenuItem onClick={() => useMonocleStore.getState().toggleOngoing(task.id)}><span className="mr-2 text-sm leading-none">🌊</span> Mark as Ongoing</ContextMenuItem>
                                                                        <ContextMenuSeparator />
                                                                        <ContextMenuItem onClick={() => handleDump(task.id)}><Archive className="mr-2 h-4 w-4" /> Send to Idea Dump</ContextMenuItem>
                                                                        <ContextMenuItem onClick={() => handleArchive(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                        <ContextMenuSeparator />
                                                                        <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                                    </ContextMenuContent>
                                                                </ContextMenu>
                                                            ))}
                                                                {provided.placeholder}
                                                                        </AccordionContent>
                                                                    </div>
                                                                )}
                                                            </Droppable>
                                                        </AccordionItem>
                                                    </Accordion>

                                                    {/* Idea Dump Section */}
                                                    <Accordion type="single" collapsible className="mt-8 transition-colors rounded-xl min-h-[50px]">
                                                        <AccordionItem value="drafts" className="border-none">
                                                            <AccordionTrigger className="flex items-center gap-2 px-2 pt-2 mb-3 hover:no-underline py-0">
                                                                <div className="flex items-center gap-2 flex-1 justify-start">
                                                                    <Lightbulb className="h-3 w-3 text-indigo-500/70" />
                                                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/70 flex items-center gap-2 m-0">
                                                                        Idea Dump
                                                                        <span className="bg-indigo-500/10 px-1.5 py-0.5 rounded-full">{draftTasks.length}</span>
                                                                    </h3>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="space-y-2 pb-4 pt-1 px-1">
                                                                <Droppable droppableId="drafts">
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            {...provided.droppableProps}
                                                                            ref={provided.innerRef}
                                                                            className={cn(
                                                                                "min-h-[50px] space-y-2 transition-colors rounded-xl",
                                                                                snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20 ring-inset p-2" : ""
                                                                            )}
                                                                        >
                                                                            {draftTasks.length === 0 && (
                                                                                <div className="text-center py-4 px-4 text-muted-foreground/30 italic text-xs border-2 border-dashed border-muted-foreground/10 rounded-xl">
                                                                                    Drag tasks here to send them to the Idea Dump.
                                                                                </div>
                                                                            )}
                                                                            {draftTasks.map((task, index) => (
                                                                                <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!!searchQuery || sortMode !== 'manual'}>
                                                                                    {(provided, snapshot) => (
                                                                                        <div
                                                                                            ref={provided.innerRef}
                                                                                            {...provided.draggableProps}
                                                                                            {...provided.dragHandleProps}
                                                                                            className={cn("user-select-none", snapshot.isDragging && "z-50 ")}
                                                                                            style={provided.draggableProps.style}
                                                                                        >
                                                                                            <ContextMenu key={task.id}>
                                                                                                <ContextMenuTrigger onDoubleClick={(e) => { e.preventDefault(); handleEdit(task); }}>
                                                                                                    <SwipeableTask
                                                                                                        task={task}
                                                                                                        isMobile={isBelowMd}
                                                                                                        leftAction={() => { useMonocleStore.getState().toggleDraft(task.id); toast.success("Sent to Queue"); }}
                                                                                                        rightAction={() => handleDelete(task.id)}
                                                                                                        onTap={(task) => handleEdit(task)}
                                                                                                        leftIcon={CornerUpLeft}
                                                                                                        leftLabel="To Queue"
                                                                                                        leftBgClass="bg-blue-500"
                                                                                                        leftColorClass="text-blue-600"
                                                                                                        rightIcon={Trash2}
                                                                                                        rightLabel="Delete"
                                                                                                        rightBgClass="bg-red-500"
                                                                                                        rightColorClass="text-red-700"
                                                                                                    >
                                                                                                        <div className={cn("group bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer opacity-70 hover:opacity-100", snapshot.isDragging && "rotate-2 scale-105 shadow-xl ring-2 ring-primary/20 cursor-grabbing")}>
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
                                                                                                                    <p className="text-sm font-medium truncate text-muted-foreground">
                                                                                                                        <FormattedText text={task.title} />
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                                {task.description && (
                                                                                                                    <p className="text-xs text-muted-foreground/50 line-clamp-2 mb-0.5 max-w-[90%]">
                                                                                                                        {task.description}
                                                                                                                    </p>
                                                                                                                )}
                                                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 mt-0.5">
                                                                                                                    <TaskAgingBadges task={task} /> {task.launchDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(task.launchDate, 'MMM d')}</span>}
                                                                                                                    {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1 text-muted-foreground/60" title="Has attachments"><ImageIcon className="h-3 w-3" /></span>}
                                                                                                                    {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500/50" />}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
                                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); useMonocleStore.getState().toggleDraft(task.id); toast.success("Added to Queue"); }} title="Send to Queue"><CornerUpLeft className="h-3 w-3" /></Button>
                                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-primary rounded-full relative" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(task); }} title="Edit Task"><Edit2 className="h-3 w-3" /></Button>
                                                                                                                <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-red-500 rounded-full relative leading-none" type="button" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} title="Delete"><Trash2 className="h-3 w-3" /></Button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </SwipeableTask>
                                                                                                </ContextMenuTrigger>
                                                                                                <ContextMenuContent>
                                                                                                    <ContextMenuItem onClick={() => { useMonocleStore.getState().toggleDraft(task.id); toast.success("Sent to Queue"); }}><CornerUpLeft className="mr-2 h-4 w-4" /> Send to Queue</ContextMenuItem>
                                                                                                    <ContextMenuSeparator />
                                                                                                    <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().toggleOngoing(task.id)}><span className="mr-2 text-sm leading-none">🌊</span> Mark as Ongoing</ContextMenuItem>
                                                                                                    <ContextMenuSeparator />
                                                                                                    <ContextMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                                                                </ContextMenuContent>
                                                                                            </ContextMenu>
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            ))}
                                                                            {provided.placeholder}
                                                                        </div>
                                                                    )}
                                                                </Droppable>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
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
                                                                    <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
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
                                                                else if (!t.launchDate) groups['No Date'].push(t);
                                                                else if (isPast(t.launchDate) && !isToday(t.launchDate)) groups['Overdue'].push(t);
                                                                else if (isToday(t.launchDate)) groups['Today'].push(t);
                                                                else if (isTomorrow(t.launchDate)) groups['Tomorrow'].push(t);
                                                                else if (isThisWeek(t.launchDate)) groups['Upcoming'].push(t);
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
                                                                    if (a.launchDate && b.launchDate) {
                                                                        return a.launchDate - b.launchDate;
                                                                    }
                                                                    if (a.launchDate) return -1;
                                                                    if (b.launchDate) return 1;

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
                                                                                                    {(() => {
                                                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                                        if (!proj) return null;
                                                                                                        return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                                                    })()}
                                                                                                    <TaskAgingBadges task={task} /> {task.launchDate && <span className={cn("flex items-center gap-1", isPast(task.launchDate) && !isToday(task.launchDate) && "text-red-500 font-bold")}><Calendar className="h-3 w-3" />{format(task.launchDate, 'MMM d')}</span>}
                                                                                                    {task.recurrence && <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}><Repeat className="h-3 w-3" /></span>}
                                                                                                    {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1 text-muted-foreground/60" title="Has attachments"><ImageIcon className="h-3 w-3" /></span>}
                                                                                                    {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                                                    {task.priority === 'low' && <AlertCircle className="h-3 w-3 text-blue-500" />}
                                                                                                </div>
                                                                                            </div>
                                                                                            {task.id === currentActiveTask?.id && <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Now</span>}
                                                                                            <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
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
<ContextMenuItem onClick={() => setTaskToSubdivide(task)}><Split className="mr-2 h-4 w-4" /> Subdivide</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                    <ContextMenuItem onClick={() => handleMakeNext(task.id)}><ArrowUpCircle className="mr-2 h-4 w-4" /> Make Next</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleDump(task.id)}><Archive className="mr-2 h-4 w-4" /> Send to Idea Dump</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleArchive(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().waitTask(task.id)}><Hourglass className="mr-2 h-4 w-4" /> Mark as Waiting</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().updateTask(task.id, { status: 'waiting', isBlocked: !task.isBlocked })}><Hourglass className="mr-2 h-4 w-4" /> {task.isBlocked ? 'Unmark Blocked' : 'Mark as Blocked'}</ContextMenuItem>
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
                                                                    if (!a.launchDate) return 1;
                                                                    if (!b.launchDate) return -1;
                                                                    return a.launchDate - b.launchDate;
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
                                                                                                    {(() => {
                                                                                                        const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                                                                                                        if (!proj) return null;
                                                                                                        return <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 truncate max-w-[120px]">{proj.name}</span>;
                                                                                                    })()}
                                                                                                <TaskAgingBadges task={task} /> {task.launchDate && <span className={cn("flex items-center gap-1", isPast(task.launchDate) && !isToday(task.launchDate) && "text-red-500 font-bold")}><Calendar className="h-3 w-3" />{format(task.launchDate, 'MMM d')}</span>}
                                                                                                {task.recurrence && <span className="flex items-center gap-1 text-orange-500/80" title={`Repeats ${task.recurrence}`}><Repeat className="h-3 w-3" /></span>}
                                                                                                {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1 text-muted-foreground/60" title="Has attachments"><ImageIcon className="h-3 w-3" /></span>}
                                                                                                {task.priority === 'high' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                                                {task.priority === 'low' && <AlertCircle className="h-3 w-3 text-blue-500" />}
                                                                                            </div>
                                                                                        </div>
                                                                                        {task.id === currentActiveTask?.id && <span className="text-[10px] font-bold text-primary uppercase tracking-wider shrink-0">Now</span>}
                                                                                        <div className="hidden md:flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all z-50 shrink-0">
    {variant === 'sidebar' && (
        <div 
            draggable={true} 
            onDragStart={(e) => { 
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, title: task.title }));
                e.dataTransfer.effectAllowed = 'copy';
                const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                ghost.style.position = 'absolute';
                ghost.style.top = '-1000px';
                ghost.style.opacity = '0';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                setTimeout(() => document.body.removeChild(ghost), 0);
            }}
            className="h-6 w-6 hidden md:flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-blue-500 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground mr-1"
            title="Drag to Planner"
        >
            <Calendar className="h-3 w-3" />
        </div>
    )}
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
<ContextMenuItem onClick={() => setTaskToSubdivide(task)}><Split className="mr-2 h-4 w-4" /> Subdivide</ContextMenuItem>
                                                                                    <ContextMenuSeparator />
                                                                                    <ContextMenuItem onClick={() => handleMakeNext(task.id)}><ArrowUpCircle className="mr-2 h-4 w-4" /> Make Next</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleDump(task.id)}><Archive className="mr-2 h-4 w-4" /> Send to Idea Dump</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => handleArchive(task.id)}><CheckCircle2 className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().waitTask(task.id)}><Hourglass className="mr-2 h-4 w-4" /> Mark as Waiting</ContextMenuItem>
                                                                                    <ContextMenuItem onClick={() => useMonocleStore.getState().updateTask(task.id, { status: 'waiting', isBlocked: !task.isBlocked })}><Hourglass className="mr-2 h-4 w-4" /> {task.isBlocked ? 'Unmark Blocked' : 'Mark as Blocked'}</ContextMenuItem>
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
                            You pasted multiple lines. Do you want to create a separate task (or idea) for each line?
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
                                handleBatchAdd(pendingPaste, false);
                            }
                        }}>
                            Create Tasks
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export function QueueView({ customTrigger, defaultTab = 'active', variant = 'sheet' }: QueueViewProps) {
    const { activeSheet, setOpenSheet } = useMonocleStore();

    // Derived open state for the Sheet (only used when variant === 'sheet')
    const sheetOpen = variant === 'sheet' && activeSheet === 'queue';

    if (variant === 'fullscreen' || variant === 'sidebar') {
        return (
            <div className={cn("w-full h-full bg-transparent overflow-hidden", variant === 'fullscreen' ? "p-0 sm:p-4" : "p-0")}>
                <QueueContent defaultTab={defaultTab} variant={variant} />
            </div>
        );
    }

    return (
        <Sheet open={sheetOpen} onOpenChange={(val) => setOpenSheet(val ? 'queue' : null)}>
            {customTrigger && <SheetTrigger asChild>{customTrigger}</SheetTrigger>}
            <SheetContent side="left" className="w-[85vw] sm:w-[500px] p-0 border-r-0 sm:border-r" showCloseButton={false}>
                <QueueContent defaultTab={defaultTab} variant="sheet" />
            </SheetContent>
        </Sheet>
    );
}
