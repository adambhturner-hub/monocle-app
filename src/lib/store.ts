import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { addDays, addWeeks, addMonths, addYears, isToday } from 'date-fns';

// Custom IndexedDB storage adapter
export const idbStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return (await get(name)) || null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await set(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await del(name);
    }
};
import { Task, Project, FocusSession, SessionOutcome } from '@/types';
import { soundEngine } from '@/lib/sound-engine';
import { haptics } from '@/lib/haptics';
import { generateId } from '@/lib/utils';
import { fetchUrlMeta } from '@/app/actions/unfurl';
import * as linkify from 'linkifyjs';

async function autoUnfurlTask(store: any, taskId: string, text: string, field: 'title' | 'description') {
    if (!text) return;
    const links = linkify.find(text).filter(l => l.type === 'url' && l.isLink);
    if (links.length === 0) return;

    const markdownLinkRegex = /\[[^\]]+\]\([^)]+\)/g;
    const markdownLinks: { start: number, end: number }[] = [];
    let match;
    while ((match = markdownLinkRegex.exec(text)) !== null) {
        markdownLinks.push({ start: match.index, end: markdownLinkRegex.lastIndex });
    }

    for (const link of links) {
        // Skip if already inside a markdown link: e.g. [Title](url)
        const isInsideMarkdown = markdownLinks.some(m => link.start >= m.start && link.end <= m.end);
        if (isInsideMarkdown) continue;

        // Skip if formatted with pipe syntax: e.g. url | label
        const textAfter = text.slice(link.end);
        if (/^\s+\|/.test(textAfter)) {
            continue;
        }

        try {
            const meta = await fetchUrlMeta(link.href);
            if (meta && meta.title && !meta.error) {
                const processedText = text.slice(0, link.start) + `[${meta.title}](${link.href})` + text.slice(link.end);
                store.getState().updateTask(taskId, { [field]: processedText });
                return;
            }
        } catch (e) {
            console.error("Failed to unfurl", link.href, e);
        }
    }
}

const DEFAULT_SETTINGS: MonocleState['settings'] = {
    sortMode: 'manual',
    archiveRetention: 30,
    nightShiftSweep: false,
    soundEnabled: true,
    hasSeenOnboarding: false,
    weeklyInsight: undefined
};

const DEMO_TASKS: Task[] = [
    {
        id: generateId(),
        title: 'Welcome to Monocle 🚀',
        description: '1. Hit "Focus Mode" to enter the cockpit.\n2. Complete tasks ruthlessly.',
        status: 'todo',
        createdAt: Date.now() - 4000,
        priority: 'medium',
        isDraft: false
    },
    {
        id: generateId(),
        title: 'Drop an idea in the Dump',
        description: 'Swipe me Right or drag me down to promote me to the active Queue!',
        status: 'todo',
        createdAt: Date.now() - 3000,
        priority: 'low',
        isDraft: true
    },
    {
        id: generateId(),
        title: 'Add Monocle to your homescreen',
        description: 'Pro Tip: Tap "Share" > "Add to Home Screen" for the best offline experience.',
        status: 'todo',
        createdAt: Date.now() - 2000,
        priority: 'high',
        isLightning: true,
        isDraft: false
    },
    {
        id: generateId(),
        title: 'Crush your biggest priority',
        description: 'This is a Frog 🐸. You can only have one active at a time. It cannot be skipped.',
        status: 'todo',
        createdAt: Date.now() - 1000,
        priority: 'high',
        isFrog: true,
        isDraft: false
    }
];

interface MonocleState {
    tasks: Task[];
    projects: Project[];
    deletedIds: string[];
    activeProject: string | null; // 'null' means All Projects
    lastModified: number; // For sync conflict resolution

    // Actions
    setTask: (tasks: Task[]) => void; // For reordering
    addTask: (task: Task) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;

    addProject: (project: Project) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    setActiveProject: (id: string | null) => void;

    // UI State
    activeSheet: 'queue' | 'archive' | 'settings' | 'stats' | null;
    setOpenSheet: (sheet: 'queue' | 'archive' | 'settings' | 'stats' | null) => void;
    activeModal: 'add-task' | 'project-manager' | 'shortcuts-help' | null;
    setActiveModal: (modal: 'add-task' | 'project-manager' | 'shortcuts-help' | null) => void;

    draftTaskData: Partial<Task> | null;
    setDraftTaskData: (draft: Partial<Task> | null) => void;

    view: 'capture' | 'focus' | 'queue' | 'ideas' | 'analytics';
    setView: (view: 'capture' | 'focus' | 'queue' | 'ideas' | 'analytics') => void;

    // Undo Logic
    lastState: Task[] | null;
    captureSnapshot: () => void;
    undo: () => void;
    duplicateTask: (id: string) => void;
    toggleDraft: (id: string) => void;

    // Queue Actions
    completeTask: (taskId?: string) => { nextTask?: Task } | void;
    archiveTask: (id: string) => { nextTask?: Task } | void;
    holdTask: (taskId?: string) => void;
    snoozeTask: (durationMinutes: number, taskId?: string) => void;
    wakeTask: (id: string) => void;
    skipTask: (taskId?: string) => void;
    randomTask: () => void;
    promoteTask: (id: string) => void;
    prioritizeTask: () => void; // Sorts queue by priority
    cyclePriority: () => void; // Changes priority of current task
    restoreTask: (id: string) => void;
    purgeArchivedTasks: (days: number | 'all') => void;

    // Settings
    settings: {
        sortMode: 'manual' | 'date' | 'priority';
        archiveRetention: number; // days
        nightShiftSweep: boolean;
        soundEnabled?: boolean;
        hasSeenOnboarding: boolean;
        weeklyInsight?: { text: string; generatedAt: number; };
    };
    updateSettings: (settings: Partial<MonocleState['settings']>) => void;

    // Getters
    getVisibleTasks: () => Task[];

    // Focus Session
    currentSession: FocusSession | null;
    sessionHistory: FocusSession[];
    startSession: (taskId: string, durationMinutes: number) => void;
    pauseSession: () => void;
    resumeSession: () => void;
    stopSession: (outcome: SessionOutcome) => void; // Updates elapsed time
    getAutoPickedTask: () => Task | null;
    getCompletedTodayCount: () => number;
    toggleFrog: (id: string) => void;
    frogDetourActive: boolean;
    activeRandomTaskId: string | null;

    lastActiveDate?: string; // YYYY-MM-DD string to track day rollovers

    // Command Palette Power Features
    recentCommands: RecentCommand[];
    addRecentCommand: (cmd: Omit<RecentCommand, 'timestamp'>) => void;
    jumpToTask: (taskId: string) => void;

    // Cloud Sync & Storage
    loadFromCloud: (cloudState: Partial<MonocleState>) => void;
    clearData: () => void;

    lastSyncTime: number | null;
    setLastSyncTime: (time: number | null) => void;
    syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
    setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void;
    syncErrorDetails?: string;
    setSyncErrorDetails: (details?: string) => void;

    isHydrated?: boolean;
    setHydrated?: () => void;
}

export interface RecentCommand {
    id: string; // unique ID for deduping
    type: 'task' | 'project' | 'action';
    label: string;
    payload?: any; // e.g. projectId, or just for identifying
    icon?: string; // name of lucide icon? or just infer from type
    timestamp: number;
}

// ... imports

export const useMonocleStore = create<MonocleState>()(
    persist(
        (rawSet, get) => {
            const set = (
                partialFnOrObj: MonocleState | Partial<MonocleState> | ((state: MonocleState) => MonocleState | Partial<MonocleState>),
                replace?: boolean | undefined
            ) => {
                rawSet((state: MonocleState) => {
                    const partial = typeof partialFnOrObj === 'function' ? (partialFnOrObj as any)(state) : partialFnOrObj;
                    if (!partial) return partial as Partial<MonocleState>;

                    // Automatically bump lastModified if syncable data changed
                    const touchedSyncable = ['tasks', 'projects', 'deletedIds', 'settings', 'sessionHistory']
                        .some(key => (partial as any)[key] !== undefined);

                    if (touchedSyncable && (partial as any).lastModified === undefined) {
                        return { ...partial, lastModified: Date.now() } as Partial<MonocleState>;
                    }
                    return partial as Partial<MonocleState>;
                }, replace as false | undefined);
            };

            return ({
                tasks: [],
                projects: [],
                deletedIds: [],
                activeProject: null,
                lastModified: Date.now(),
                isHydrated: false,
                setHydrated: () => set({ isHydrated: true }),
                lastSyncTime: null,
                setLastSyncTime: (time) => set({ lastSyncTime: time }),
                syncStatus: 'idle',
                setSyncStatus: (status) => set({ syncStatus: status }),
                syncErrorDetails: undefined,
                setSyncErrorDetails: (details) => set({ syncErrorDetails: details }),
                frogDetourActive: false,
                activeRandomTaskId: null,
                lastActiveDate: new Date().toISOString().split('T')[0],

                // Settings Defaults
                settings: {
                    sortMode: 'manual',
                    archiveRetention: 30,
                    nightShiftSweep: false,
                    hasSeenOnboarding: false,
                    soundEnabled: true,
                    weeklyInsight: undefined
                },

                // Helper Getter
                getCompletedTodayCount: () => {
                    const { tasks } = get();
                    return tasks.filter(t => t.status === 'done' && t.completedAt && isToday(t.completedAt)).length;
                },

                getAutoPickedTask: () => {
                    const { tasks, activeProject, settings, frogDetourActive } = get();
                    const now = Date.now();

                    // Filter eligible tasks
                    const eligible = tasks.filter(t =>
                        !t.isDraft &&
                        t.status !== 'done' &&
                        (!activeProject || t.projectId === activeProject)
                    );

                    if (eligible.length === 0) return null;

                    // 0. The Random Curveball
                    const { activeRandomTaskId } = get();
                    if (activeRandomTaskId) {
                        const curveball = eligible.find(t => t.id === activeRandomTaskId);
                        if (curveball) return curveball;
                    }

                    // 1. The Daily Frog (Apex Task)
                    const frog = eligible.find(t => t.isFrog);
                    if (frog) {
                        if (frogDetourActive) {
                            const detourTask = eligible.find(t => !t.isFrog);
                            return detourTask || frog;
                        }
                        return frog;
                    }

                    if (settings?.sortMode === 'priority') {
                        const priorityWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };
                        const sorted = [...eligible].sort((a, b) => {
                            const wA = priorityWeight[a.priority || 'low'] ?? 2;
                            const wB = priorityWeight[b.priority || 'low'] ?? 2;
                            if (wA !== wB) return wA - wB;

                            // Sub-sort by date within same priority
                            if (!a.dueDate && b.dueDate) return 1;
                            if (a.dueDate && !b.dueDate) return -1;
                            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
                            return 0;
                        });
                        return sorted[0];
                    }

                    if (settings?.sortMode === 'date') {
                        const sorted = [...eligible].sort((a, b) => {
                            if (!a.dueDate && b.dueDate) return 1;
                            if (a.dueDate && !b.dueDate) return -1;
                            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
                            return 0;
                        });
                        return sorted[0];
                    }

                    // 3. Medium Priority (optional, but good for flow)
                    // const medium = eligible.find(t => t.priority === 'medium');
                    // if (medium) return medium;

                    // 4. Top of Queue (First item that wasn't picked by above)
                    // Since we filtered eligible, just taking the first one is safe as a fallback
                    // conforming to "next in manual queue"
                    return eligible[0];
                },

                loadFromCloud: (cloudState) => set((state) => {
                    // Combine local and cloud deleted IDs so deletions are honored everywhere
                    const combinedDeletedIds = new Set([
                        ...(state.deletedIds || []),
                        ...(cloudState.deletedIds || [])
                    ]);

                    // Combine local and cloud Session History IDs so completions act as tombstones for tasks
                    const combinedCompletedIds = new Set([
                        ...(state.sessionHistory || []).map(t => t.id),
                        ...(cloudState.sessionHistory || []).map(t => t.id)
                    ]);

                    // Smart merge arrays by ID to prevent devices from overwriting each others tasks
                    const mergeById = <T extends { id: string, updatedAt?: number }>(
                        local: T[],
                        cloud: T[],
                        skipLocalIds?: Set<string>
                    ) => {
                        const localMap = new Map(local.map(item => [item.id, item]));
                        const mergedMap = new Map<string, T>();

                        // Add all cloud items, ignoring ones marked as deleted
                        cloud.forEach(item => {
                            if (!combinedDeletedIds.has(item.id)) {
                                const localVal = localMap.get(item.id);
                                if (localVal && localVal.updatedAt && (!item.updatedAt || localVal.updatedAt > item.updatedAt)) {
                                    // Row-Level CRDT: If local task was edited more recently than the cloud version, keep local.
                                    mergedMap.set(item.id, localVal);
                                } else {
                                    mergedMap.set(item.id, item);
                                }
                            }
                        });

                        // Add local items that don't exist in cloud (offline creations)
                        // (But only if they aren't deleted, and not completed on another device)
                        localMap.forEach((item, id) => {
                            if (!mergedMap.has(id) && !combinedDeletedIds.has(id)) {
                                if (skipLocalIds && skipLocalIds.has(id)) return; // Skip resurrected tasks that were completed
                                mergedMap.set(id, item);
                            }
                        });

                        return Array.from(mergedMap.values());
                    };

                    // Merge tasks
                    let mergedTasks = cloudState.tasks !== undefined ? mergeById(state.tasks, cloudState.tasks, combinedCompletedIds) as Task[] : state.tasks;

                    // Enforce single frog rule after merge
                    const frogs = mergedTasks.filter(t => t.isFrog).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    if (frogs.length > 1) {
                        const keepFrogId = frogs[0].id;
                        mergedTasks = mergedTasks.map(t => t.isFrog && t.id !== keepFrogId ? { ...t, isFrog: false, isAvoidedFrog: true, avoidedAt: Date.now(), dueDate: Date.now(), priority: 'medium' as const, updatedAt: Date.now() } : t);
                    }

                    return {
                        ...state,
                        deletedIds: Array.from(combinedDeletedIds),
                        tasks: mergedTasks,
                        projects: cloudState.projects !== undefined ? mergeById(state.projects, cloudState.projects) : state.projects,
                        settings: cloudState.settings !== undefined ? { ...state.settings, ...cloudState.settings } : state.settings,
                        sessionHistory: cloudState.sessionHistory !== undefined ? mergeById(state.sessionHistory, cloudState.sessionHistory) : state.sessionHistory,
                        lastModified: cloudState.lastModified !== undefined ? cloudState.lastModified : state.lastModified,
                    };
                }),

                updateSettings: (newSettings) => set((state) => ({
                    settings: { ...state.settings, ...newSettings }
                })),

                clearData: () => set({
                    tasks: [],
                    projects: [],
                    deletedIds: [],
                    sessionHistory: [],
                    currentSession: null,
                    activeRandomTaskId: null,
                    settings: { ...DEFAULT_SETTINGS, hasSeenOnboarding: true },
                    view: 'queue',
                    activeSheet: null,
                    activeModal: null
                }),

                setTask: (tasks) => set({ tasks }),

                addTask: (task) => {
                    set((state) => {
                        let newTasks = state.tasks;
                        if (task.isFrog) {
                            newTasks = newTasks.map(t => t.isFrog ? { ...t, isFrog: false, isAvoidedFrog: true, avoidedAt: Date.now(), dueDate: Date.now(), priority: 'medium' as const, updatedAt: Date.now() } : t);
                        }
                        return { tasks: [...newTasks, { ...task, updatedAt: Date.now() }], lastModified: Date.now() };
                    });
                    const state = get();
                    if (state.settings?.soundEnabled !== false) {
                        soundEngine.playAdd();
                        haptics.click();
                    }
                    autoUnfurlTask(useMonocleStore, task.id, task.title, 'title');
                    if (task.description) {
                        autoUnfurlTask(useMonocleStore, task.id, task.description, 'description');
                    }
                },

                updateTask: (id, updates) => {
                    set((state) => {
                        let newTasks = state.tasks;
                        if (updates.isFrog) {
                            newTasks = newTasks.map(t => t.isFrog && t.id !== id ? { ...t, isFrog: false, isAvoidedFrog: true, avoidedAt: Date.now(), dueDate: Date.now(), priority: 'medium' as const, updatedAt: Date.now() } : t);
                        }
                        return {
                            tasks: newTasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)), lastModified: Date.now()
                        };
                    });
                    if (updates.title) autoUnfurlTask(useMonocleStore, id, updates.title, 'title');
                    if (updates.description) autoUnfurlTask(useMonocleStore, id, updates.description, 'description');
                },

                deleteTask: (id) =>
                    set((state) => ({
                        tasks: state.tasks.filter((t) => t.id !== id),
                        deletedIds: [...(state.deletedIds || []), id], lastModified: Date.now()
                    })),

                addProject: (project) => set((state) => ({
                    projects: [...state.projects, { ...project, updatedAt: Date.now() }], lastModified: Date.now()
                })),

                updateProject: (id, updates) =>
                    set((state) => ({
                        projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)), lastModified: Date.now()
                    })),

                deleteProject: (id) =>
                    set((state) => ({
                        projects: state.projects.filter((p) => p.id !== id),
                        deletedIds: [...(state.deletedIds || []), id], lastModified: Date.now(),
                        // Remove project reference from all tasks that had it
                        tasks: state.tasks.map(t => t.projectId === id ? { ...t, projectId: undefined, updatedAt: Date.now() } : t),
                        // If the active project is the one being deleted, switch to 'All Projects'
                        activeProject: state.activeProject === id ? null : state.activeProject
                    })),

                setActiveProject: (id) => set({ activeProject: id }),

                // UI State
                activeSheet: null,
                setOpenSheet: (sheet) => set({ activeSheet: sheet }),

                activeModal: null,
                setActiveModal: (modal) => set({ activeModal: modal }),

                draftTaskData: null,
                setDraftTaskData: (draft) => set({ draftTaskData: draft }),

                view: 'focus',
                setView: (view) => set({ view }),

                // Undo Logic
                lastState: null,
                captureSnapshot: () => set((state) => ({ lastState: [...state.tasks] })),
                undo: () => set((state) => {
                    if (!state.lastState) return {};
                    return { tasks: [...state.lastState], lastState: null };
                }),

                duplicateTask: (id) => set((state) => {
                    const task = state.tasks.find(t => t.id === id);
                    if (!task) return {};

                    const newTask: Task = {
                        ...task,
                        id: generateId(),
                        title: `${task.title} (Copy)`,
                        createdAt: Date.now(),
                        status: 'todo', // Reset status to todo
                        isDraft: true, // Duplicate as draft
                        isFrog: false, // Do not duplicate frog status
                        archivedAt: undefined, // Clear archive data
                        completedAt: undefined, // Clear completion data
                        updatedAt: Date.now() // Sync timestamp
                    };

                    return { tasks: [...state.tasks, newTask] };
                }),

                toggleDraft: (id) => set((state) => ({
                    tasks: state.tasks.map(t => t.id === id ? { ...t, isDraft: !t.isDraft, updatedAt: Date.now() } : t)
                })),

                toggleFrog: (id) =>
                    set((state) => {
                        const task = state.tasks.find(t => t.id === id);
                        if (!task) return {};

                        const lastState = [...state.tasks];
                        const isBecomingFrog = !task.isFrog;

                        const newTasks = state.tasks.map(t => {
                            if (t.id === id) {
                                if (isBecomingFrog) {
                                    return { ...t, isFrog: true, dueDate: undefined, priority: 'medium' as const, updatedAt: Date.now() };
                                } else {
                                    return { ...t, isFrog: false, dueDate: Date.now(), priority: 'medium' as const, updatedAt: Date.now() };
                                }
                            }
                            // Demote ALL other frogs if we are becoming the frog
                            if (isBecomingFrog && t.isFrog) {
                                return { ...t, isFrog: false, isAvoidedFrog: true, avoidedAt: Date.now(), dueDate: Date.now(), priority: 'medium' as const, updatedAt: Date.now() };
                            }
                            return t;
                        });

                        return { tasks: newTasks, lastState, frogDetourActive: false };
                    }),

                getVisibleTasks: () => {
                    const { tasks, activeProject } = get();
                    return tasks.filter(t =>
                        !t.isDraft &&
                        t.status !== 'done' &&
                        (activeProject ? t.projectId === activeProject : true)
                    );
                },

                completeTask: (taskId?: string) => {
                    let generatedTask: Task | undefined;
                    set((state) => {
                        const taskToComplete = taskId ? state.tasks.find(t => t.id === taskId) : get().getAutoPickedTask();
                        if (!taskToComplete) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        // Play Sound (Global check)
                        if (state.settings?.soundEnabled !== false) {
                            if (taskToComplete.isFrog) {
                                soundEngine.playRibbit();
                                haptics.success();
                            } else {
                                soundEngine.playComplete();
                                haptics.heavy();
                            }
                        }

                        // Check for active session
                        if (state.currentSession && state.currentSession.taskId === taskToComplete.id) {
                            // Stop it as 'complete_task'
                            const completedSession: FocusSession = {
                                ...state.currentSession,
                                endTime: Date.now(),
                                status: 'completed',
                                outcome: 'complete_task'
                            };
                            // We can't call set inside set easily without nesting or helpers
                            // But we are in set.
                            // We will return `sessionHistory` update in the final return.
                            state.sessionHistory = [completedSession, ...state.sessionHistory];
                            state.currentSession = null;
                            // Use local vars if we can't mutate state directly (zustand immerse vs normal)
                            // This is normal zustand, can't mutate `state`.
                            // Re-do this properly.
                        }
                        const archivedTask = {
                            ...taskToComplete,
                            status: 'done' as const,
                            completedAt: Date.now(),
                            archivedAt: Date.now(),
                            updatedAt: Date.now()
                        };

                        const otherTasks = state.tasks.filter(t => t.id !== taskToComplete.id);
                        const newTasks = [...otherTasks, archivedTask];

                        // Recurrence Logic
                        if (taskToComplete.recurrence) {
                            let nextDueDate = Date.now();
                            const currentDue = taskToComplete.dueDate || Date.now();

                            switch (taskToComplete.recurrence) {
                                case 'daily':
                                    nextDueDate = addDays(currentDue, 1).getTime();
                                    break;
                                case 'weekly':
                                    nextDueDate = addWeeks(currentDue, 1).getTime();
                                    break;
                                case 'monthly':
                                    nextDueDate = addMonths(currentDue, 1).getTime();
                                    break;
                                case 'yearly':
                                    nextDueDate = addYears(currentDue, 1).getTime();
                                    break;
                                default:
                                    if (typeof taskToComplete.recurrence === 'number') {
                                        nextDueDate = addDays(currentDue, taskToComplete.recurrence).getTime();
                                    }
                            }

                            const nextTask: Task = {
                                ...taskToComplete,
                                id: generateId(),
                                dueDate: nextDueDate,
                                status: 'todo',
                                createdAt: Date.now(),
                                completedAt: undefined,
                                archivedAt: undefined,
                                // Wash metadata clean
                                isFrog: false,
                                isLightning: false,
                                friction: { skips: 0, holds: 0 },
                                updatedAt: Date.now()
                            };

                            generatedTask = nextTask;
                            newTasks.push(nextTask);
                        }

                        return { tasks: newTasks, lastState, frogDetourActive: false, activeRandomTaskId: null };
                    });
                    if (generatedTask) return { nextTask: generatedTask };
                },

                archiveTask: (id) => {
                    let generatedTask: Task | undefined;
                    set((state) => {
                        const taskToArchive = state.tasks.find(t => t.id === id);
                        if (!taskToArchive) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        // Archive the current task
                        const archivedTask = {
                            ...taskToArchive,
                            status: 'done' as const,
                            completedAt: Date.now(),
                            archivedAt: Date.now(),
                            updatedAt: Date.now()
                        };

                        const otherTasks = state.tasks.filter(t => t.id !== id);
                        const newTasks = [...otherTasks, archivedTask];

                        // Recurrence Logic (duplicate of completeTask but for specific ID)
                        if (taskToArchive.recurrence) {
                            let nextDueDate = Date.now();
                            const currentDue = taskToArchive.dueDate || Date.now();

                            switch (taskToArchive.recurrence) {
                                case 'daily':
                                    nextDueDate = currentDue + 24 * 60 * 60 * 1000;
                                    break;
                                case 'weekly':
                                    nextDueDate = currentDue + 7 * 24 * 60 * 60 * 1000;
                                    break;
                                case 'monthly':
                                    const d = new Date(currentDue);
                                    d.setMonth(d.getMonth() + 1);
                                    nextDueDate = d.getTime();
                                    break;
                                case 'yearly':
                                    const y = new Date(currentDue);
                                    y.setFullYear(y.getFullYear() + 1);
                                    nextDueDate = y.getTime();
                                    break;
                                default:
                                    if (typeof taskToArchive.recurrence === 'number') {
                                        nextDueDate = currentDue + taskToArchive.recurrence * 24 * 60 * 60 * 1000;
                                    }
                            }

                            const nextTask: Task = {
                                ...taskToArchive,
                                id: generateId(),
                                dueDate: nextDueDate,
                                status: 'todo',
                                createdAt: Date.now(),
                                completedAt: undefined,
                                archivedAt: undefined,
                                updatedAt: Date.now()
                            };

                            generatedTask = nextTask;
                            newTasks.push(nextTask);
                        }

                        return { tasks: newTasks, lastState, frogDetourActive: false, activeRandomTaskId: null };
                    });
                    if (generatedTask) return { nextTask: generatedTask };
                },

                holdTask: (taskId?: string) =>
                    set((state) => {
                        const currentTask = taskId ? state.tasks.find(t => t.id === taskId) : get().getAutoPickedTask();
                        if (!currentTask) return {};

                        const visible = state.tasks.filter(t => !t.isDraft && t.status !== 'done' && (state.activeProject ? t.projectId === state.activeProject : true));
                        if (visible.length < 2) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        const nextTask = visible.find(t => t.id !== currentTask.id);

                        // Remove currentTask from global list
                        const otherTasks = state.tasks.filter(t => t.id !== currentTask.id);

                        // Find index of Task B in global list
                        const nextTaskIndex = nextTask ? otherTasks.findIndex(t => t.id === nextTask.id) : -1;

                        if (nextTaskIndex !== -1) {
                            // Insert A after B
                            otherTasks.splice(nextTaskIndex + 1, 0, currentTask);
                        } else {
                            otherTasks.push(currentTask);
                        }

                        return { tasks: otherTasks, lastState };
                    }),

                skipTask: (taskId?: string) =>
                    set((state) => {
                        const currentTask = taskId ? state.tasks.find(t => t.id === taskId) : get().getAutoPickedTask();
                        if (!currentTask) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        // Active Session Handling
                        let newCurrentSession = state.currentSession;
                        let newSessionHistory = state.sessionHistory;

                        if (newCurrentSession && newCurrentSession.taskId === currentTask.id) {
                            const completedSession: FocusSession = {
                                ...newCurrentSession,
                                endTime: Date.now(),
                                status: 'completed',
                                outcome: 'skip_task'
                            };
                            newSessionHistory = [completedSession, ...state.sessionHistory];
                            newCurrentSession = null;
                        }

                        const isSkippingFrog = currentTask.isFrog;

                        const updatedTask = {
                            ...currentTask,
                            isAvoidedFrog: currentTask.isFrog ? true : currentTask.isAvoidedFrog,
                            avoidedAt: currentTask.isFrog ? Date.now() : currentTask.avoidedAt,
                            friction: {
                                skips: (currentTask.friction?.skips || 0) + 1,
                                holds: currentTask.friction?.holds || 0
                            },
                            updatedAt: Date.now()
                        };

                        let nextTasks = [...state.tasks];

                        if (isSkippingFrog) {
                            // DO NOT move the frog physically.
                            nextTasks = nextTasks.map(t => t.id === currentTask.id ? updatedTask : t);
                        } else {
                            // Move normal tasks to the bottom of the active queue
                            nextTasks = nextTasks.filter(t => t.id !== currentTask.id);
                            nextTasks.push(updatedTask);
                        }

                        if (state.settings?.soundEnabled !== false) {
                            soundEngine.playSkip();
                            haptics.swipe();
                        }

                        return {
                            tasks: nextTasks,
                            lastState,
                            currentSession: newCurrentSession,
                            sessionHistory: newSessionHistory,
                            frogDetourActive: Boolean(isSkippingFrog),
                            activeRandomTaskId: null
                        };
                    }),

                snoozeTask: (durationMinutes, taskId) =>
                    set((state) => {
                        const currentTask = taskId ? state.tasks.find(t => t.id === taskId) : get().getAutoPickedTask();
                        if (!currentTask) return {};

                        const lastState = [...state.tasks];

                        // Active Session Handling
                        let newCurrentSession = state.currentSession;
                        let newSessionHistory = state.sessionHistory;

                        if (newCurrentSession && newCurrentSession.taskId === currentTask.id) {
                            const completedSession: FocusSession = {
                                ...newCurrentSession,
                                endTime: Date.now(),
                                status: 'completed',
                                outcome: 'skip_task'
                            };
                            newSessionHistory = [completedSession, ...state.sessionHistory];
                            newCurrentSession = null;
                        }

                        const cooldownMs = durationMinutes * 60 * 1000;
                        const skippedUntil = cooldownMs > 0 ? Date.now() + cooldownMs : undefined;

                        const updatedTask = {
                            ...currentTask,
                            skippedUntil,
                            isFrog: false,
                            isAvoidedFrog: currentTask.isFrog ? true : currentTask.isAvoidedFrog,
                            avoidedAt: currentTask.isFrog ? Date.now() : currentTask.avoidedAt,
                            friction: {
                                skips: currentTask.friction?.skips || 0,
                                holds: (currentTask.friction?.holds || 0) + 1
                            },
                            updatedAt: Date.now()
                        };

                        const otherTasks = state.tasks.filter(t => t.id !== currentTask.id);
                        const finalTasks = [...otherTasks, updatedTask];

                        if (state.settings?.soundEnabled !== false) {
                            soundEngine.playHold();
                            haptics.swipe();
                        }

                        return { tasks: finalTasks, lastState, currentSession: newCurrentSession, sessionHistory: newSessionHistory, frogDetourActive: false, activeRandomTaskId: null };
                    }),

                wakeTask: (id) =>
                    set((state) => {
                        const task = state.tasks.find(t => t.id === id);
                        if (!task) return {};

                        const lastState = [...state.tasks];
                        const updatedTask = { ...task, skippedUntil: undefined, updatedAt: Date.now() };

                        const otherTasks = state.tasks.filter(t => t.id !== id);
                        otherTasks.unshift(updatedTask);

                        return { tasks: otherTasks, lastState };
                    }),

                randomTask: () =>
                    set((state) => {
                        const now = Date.now();
                        const visible = state.tasks.filter(t =>
                            !t.isDraft &&
                            t.status !== 'done' &&
                            (state.activeProject ? t.projectId === state.activeProject : true) &&
                            (!t.skippedUntil || t.skippedUntil < now)
                        );

                        if (visible.length < 2) return {};

                        // Pick a random task that isn't the current naturally picked one
                        const currentActive = get().getAutoPickedTask();
                        const pool = visible.filter(t => t.id !== currentActive?.id);

                        if (pool.length === 0) return {};

                        const randomIndex = Math.floor(Math.random() * pool.length);
                        const randomTask = pool[randomIndex];

                        if (state.settings?.soundEnabled !== false) {
                            soundEngine.playDiceRattle();
                            haptics.swipe();
                        }

                        return { activeRandomTaskId: randomTask.id };
                    }),

                promoteTask: (id) =>
                    set((state) => {
                        const task = state.tasks.find(t => t.id === id);
                        if (!task) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        const otherTasks = state.tasks.filter(t => t.id !== id);
                        const updatedTask = { ...task, isDraft: false, updatedAt: Date.now() };
                        otherTasks.push(updatedTask);
                        return { tasks: otherTasks, lastState };
                    }),

                prioritizeTask: () =>
                    set((state) => {
                        const visible = state.tasks.filter(t => !t.isDraft && t.status !== 'done' && (state.activeProject ? t.projectId === state.activeProject : true));
                        if (visible.length < 2) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        const priorityValue = { high: 3, medium: 2, low: 1 };

                        const sorted = [...visible].sort((a, b) => {
                            const pA = priorityValue[a.priority];
                            const pB = priorityValue[b.priority];
                            if (pA !== pB) return pB - pA;
                            return a.createdAt - b.createdAt;
                        });

                        const bestTask = sorted[0];

                        if (bestTask.id === visible[0].id) {
                            return {};
                        }

                        const otherTasks = state.tasks.filter(t => t.id !== bestTask.id);
                        otherTasks.unshift(bestTask);

                        return { tasks: otherTasks, lastState };
                    }),

                cyclePriority: () =>
                    set((state) => {
                        const visible = state.tasks.filter(t => !t.isDraft && t.status !== 'done' && (state.activeProject ? t.projectId === state.activeProject : true));
                        if (visible.length === 0) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        const currentTask = visible[0];
                        const nextPriority = {
                            'low': 'medium',
                            'medium': 'high',
                            'high': 'low'
                        }[currentTask.priority] as 'low' | 'medium' | 'high';

                        const newTasks = state.tasks.map(t =>
                            t.id === currentTask.id ? { ...t, priority: nextPriority, updatedAt: Date.now() } : t
                        );

                        return { tasks: newTasks, lastState };
                    }),

                restoreTask: (id) =>
                    set((state) => {
                        const task = state.tasks.find(t => t.id === id);
                        if (!task) return {};

                        // Snapshot
                        const lastState = [...state.tasks];

                        // Logic: Restore to Position #2 (same as Hold)
                        // If queue is empty, pos 1.
                        // Position #2 means index 1.

                        const visible = state.tasks.filter(t => !t.isDraft && t.status !== 'done' && (state.activeProject ? t.projectId === state.activeProject : true));
                        const otherTasks = state.tasks.filter(t => t.id !== id);

                        const restoredTask = {
                            ...task,
                            status: 'todo' as const,
                            archivedAt: undefined,
                            // Optional: keep completedAt for history, but typically restoration implies it wasn't done?
                            // User said: "Clear archivedAt (and optionally keep completedAt for history)"
                            // Let's keep completedAt.
                            updatedAt: Date.now()
                        };

                        // Insert at Position #2
                        if (visible.length >= 1) {
                            const firstTask = visible[0];
                            // Insert after firstTask in global
                            const firstIndex = otherTasks.findIndex(t => t.id === firstTask.id);
                            if (firstIndex !== -1) {
                                otherTasks.splice(firstIndex + 1, 0, restoredTask);
                            } else {
                                otherTasks.unshift(restoredTask);
                            }
                        } else {
                            // No visible tasks, just push to top
                            otherTasks.unshift(restoredTask);
                        }

                        return { tasks: otherTasks, lastState };
                    }),

                purgeArchivedTasks: (days) =>
                    set((state) => {
                        // Snapshot
                        const lastState = [...state.tasks];

                        if (days === 'all') {
                            // Keep only tasks that are NOT done
                            const tasksToKeep = state.tasks.filter(t => t.status !== 'done');
                            return { tasks: tasksToKeep, lastState };
                        }

                        const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
                        const tasksToKeep = state.tasks.filter(t => {
                            if (t.status === 'done' && t.archivedAt && t.archivedAt < cutoffDate) {
                                return false;
                            }
                            return true;
                        });
                        return { tasks: tasksToKeep, lastState };
                    }),

                // Focus Session Implementation
                currentSession: null,
                sessionHistory: [],

                startSession: (taskId, durationMinutes) => set((state) => {
                    const task = state.tasks.find(t => t.id === taskId);
                    if (!task) return {};

                    const newSession: FocusSession = {
                        id: generateId(),
                        taskId,
                        projectId: task.projectId,
                        startTime: Date.now(),
                        durationScheduled: durationMinutes,
                        totalPausedMs: 0,
                        status: 'running'
                    };

                    if (state.settings?.soundEnabled !== false) {
                        soundEngine.playStart();
                    }

                    return { currentSession: newSession };
                }),

                pauseSession: () => set((state) => {
                    if (!state.currentSession || state.currentSession.status !== 'running') return {};
                    return {
                        currentSession: {
                            ...state.currentSession,
                            status: 'paused',
                            lastPausedAt: Date.now()
                        }
                    };
                }),

                resumeSession: () => set((state) => {
                    const session = state.currentSession;
                    if (!session || session.status !== 'paused') return {};

                    const now = Date.now();
                    const pausedDuration = session.lastPausedAt ? now - session.lastPausedAt : 0;

                    return {
                        currentSession: {
                            ...session,
                            status: 'running',
                            totalPausedMs: session.totalPausedMs + pausedDuration,
                            lastPausedAt: undefined
                        }
                    };
                }),

                stopSession: (outcome) => set((state) => {
                    if (!state.currentSession) return {};

                    // Play Sound - Only if NOT triggered by complete_task (which handles its own sound)
                    // Actually complete_task handles session stopping manually, so this function isn't called there.
                    // So we can keep this for other stop reasons if we want sounds (e.g. giving up?).
                    // "Complete" (Chord) is usually for success.
                    // "Stop" (Decaying) might be for giving up?
                    // Let's leave this as is for now, assuming only one path is taken.
                    if (outcome === 'complete_task' && state.settings?.soundEnabled !== false) {
                        soundEngine.playComplete();
                    }

                    const completedSession: FocusSession = {
                        ...state.currentSession,
                        endTime: Date.now(),
                        status: 'completed',
                        outcome,
                        updatedAt: Date.now()
                    };

                    return {
                        currentSession: null,
                        sessionHistory: [completedSession, ...state.sessionHistory]
                    };
                }),



                // Command Palette Power Features
                recentCommands: [],

                addRecentCommand: (cmd) => set((state) => {
                    // Dedupe: Remove existing if same ID
                    const others = state.recentCommands.filter(c => c.id !== cmd.id);
                    // Add to top, limit to 5
                    const newCmd: RecentCommand = { ...cmd, timestamp: Date.now() };
                    const newRecents = [newCmd, ...others].slice(0, 5);
                    return { recentCommands: newRecents };
                }),

                jumpToTask: (taskId) => set((state) => {
                    const task = state.tasks.find(t => t.id === taskId);
                    if (!task) return {};

                    // 1. Promote to Top of Queue (Index 0)
                    const otherTasks = state.tasks.filter(t => t.id !== taskId);
                    const updatedTasks = [task, ...otherTasks]; // Move to top

                    // 2. Ensure Visibility (Clear Active Project if task determines it needs to be seen?)
                    // If the task is in a specific project, and activeProject is different, we must switch.
                    // Or switch to All Projects (null) to be safe.
                    // Let's check:
                    let newActiveProject = state.activeProject;
                    if (state.activeProject && task.projectId !== state.activeProject) {
                        newActiveProject = null; // Switch to "All Projects" to ensure visibility
                    }
                    // Actually, if we want to "Jump To" it, we probably want to see its context?
                    // Or just see it in Focus Mode?
                    // Focus Mode passes `activeProject` to `getAutoPickedTask`.
                    // If we set it as top of queue, `getAutoPickedTask` will pick it (assuming no Priority overrides).
                    // But `getAutoPickedTask` FILTERS by `activeProject`.
                    // So if we don't switch activeProject, and the task is not in it, it won't be picked.
                    // So yes, we MUST ensure activeProject includes this task.
                    if (state.activeProject && task.projectId !== state.activeProject) {
                        // If task has a project, maybe switch TO that project?
                        // Or just clear filter? Clearing is safer.
                        newActiveProject = null;
                    }

                    // 3. Switch View to Focus
                    return {
                        tasks: updatedTasks,
                        view: 'focus',
                        activeProject: newActiveProject,
                        activeModal: null, // Close any modals
                        activeSheet: null // Close any sheets
                    };
                }),

            });
        },
        {
            name: 'monocle-storage',
            storage: createJSONStorage(() => idbStorage),
            version: 1,
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHydrated?.();
                }
            },
            partialize: (state) => Object.fromEntries(
                Object.entries(state).filter(([key]) => !['view', 'activeSheet', 'activeModal'].includes(key))
            ) as unknown as MonocleState,
            migrate: (persistedState: unknown, version: number) => {
                if (version === 0) {
                    const state = persistedState as MonocleState;
                    return {
                        ...state,
                        settings: {
                            ...DEFAULT_SETTINGS,
                            ...(state.settings || {}),
                        }
                    };
                }
                return persistedState as MonocleState;
            },
            merge: (persistedState: unknown, currentState: MonocleState) => {
                if (!persistedState) return currentState;

                const state = persistedState as MonocleState;

                // Onboarding Injection
                const isFirstTime = !state.settings?.hasSeenOnboarding && (!state.tasks || state.tasks.length === 0);

                let initialTasks = state.tasks || [];
                let hasSeenOnboarding = state.settings?.hasSeenOnboarding || false;

                if (isFirstTime) {
                    initialTasks = [...DEMO_TASKS];
                }

                // -------------------------------------------------------------
                // Night Shift Sweep Logic
                // -------------------------------------------------------------
                const todayStr = new Date().toISOString().split('T')[0];
                let sweptTasks = initialTasks;

                if (state.settings?.nightShiftSweep && state.lastActiveDate && state.lastActiveDate !== todayStr) {
                    sweptTasks = sweptTasks.map(t => {
                        // If it's active (not done) and in the queue (not a draft), demote it
                        if (t.status !== 'done' && !t.isDraft) {
                            return {
                                ...t,
                                isDraft: true, // Send back to Idea Dump
                                isFrog: false, // Strip Frog status
                                isLightning: false, // Strip Lightning status
                                updatedAt: Date.now()
                            };
                        }
                        return t;
                    });
                }
                // -------------------------------------------------------------

                return {
                    ...currentState,
                    ...state,
                    tasks: sweptTasks,
                    lastActiveDate: todayStr, // Always update to today when hydrating
                    settings: {
                        ...currentState.settings,
                        ...DEFAULT_SETTINGS,
                        ...(state.settings || {}),
                        hasSeenOnboarding
                    }
                };
            }
        }
    )
);


