
'use client';

import * as React from 'react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import { useMonocleStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    CheckSquare,
    Folder,
    Sun,
    Moon,
    Laptop,
    Zap,
    LayoutGrid,
    Archive
} from 'lucide-react';
import { DialogProps } from '@radix-ui/react-dialog'; // Or just use React.ComponentProps

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const {
        tasks,
        projects,
        setActiveProject,
        setView,
        setOpenSheet,
        setActiveModal,
        startSession,
        recentCommands,
        addRecentCommand,
        jumpToTask
    } = useMonocleStore();
    const { setTheme } = useTheme();
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
            // Also support Cmd+Shift+K as an alternate
            if (e.key === 'k' && e.metaKey && e.shiftKey) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown, trace?: { id: string, type: 'task' | 'project' | 'action', label: string, payload?: any }) => {
        setOpen(false);
        if (trace) {
            addRecentCommand(trace);
        }
        command();
    }, [addRecentCommand]);

    // Filter tasks for search (exclude done)
    const searchableTasks = tasks.filter(t => !t.isDraft && t.status !== 'done');

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {recentCommands.length > 0 && (
                    <>
                        <CommandGroup heading="Recent">
                            {recentCommands.map((cmd) => (
                                <CommandItem
                                    key={cmd.id}
                                    onSelect={() => runCommand(() => {
                                        // Re-execute logic based on type/payload
                                        if (cmd.type === 'action') {
                                            // Mapping back IDs to actions is tricky if we don't store the function.
                                            // We stored 'label' and 'payload'.
                                            // We rely on the ID being descriptive or using a lookup?
                                            // Simple switch for now:
                                            switch (cmd.id) {
                                                case 'add-task': setActiveModal('add-task'); break;
                                                case 'focus-mode': setView('focus'); break;
                                                case 'queue-view': setView('queue'); break;
                                                case 'settings': setOpenSheet('settings'); break;
                                                case 'archive': setOpenSheet('archive'); break;
                                                case 'theme-light': setTheme('light'); break;
                                                case 'theme-dark': setTheme('dark'); break;
                                                case 'theme-system': setTheme('system'); break;
                                            }
                                        } else if (cmd.type === 'project') {
                                            setActiveProject(cmd.payload?.projectId || null);
                                        } else if (cmd.type === 'task') {
                                            jumpToTask(cmd.payload?.taskId);
                                        }
                                    }, cmd)} // Re-add to top
                                >
                                    <span className="mr-2 text-muted-foreground opacity-70">
                                        ↺
                                    </span>
                                    <span>{cmd.label}</span>
                                    <span className="ml-2 text-xs text-muted-foreground opacity-50 capitalize">
                                        ({cmd.type})
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                    </>
                )}

                <CommandGroup heading="Actions">
                    <CommandItem
                        onSelect={() => runCommand(() => setActiveModal('add-task'), { id: 'add-task', type: 'action', label: 'Add Task' })}
                    >
                        <Zap className="mr-2 h-4 w-4" />
                        <span>Add Task</span>
                        <CommandShortcut>⌘K</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setView('focus'), { id: 'focus-mode', type: 'action', label: 'Go to Focus Mode' })}
                    >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        <span>Go to Focus Mode</span>
                        <CommandShortcut>F</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setView('queue'), { id: 'queue-view', type: 'action', label: 'Go to Queue' })}
                    >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Go to Queue</span>
                        <CommandShortcut>Q</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setOpenSheet('settings'), { id: 'settings', type: 'action', label: 'Open Settings' })}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Open Settings</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setOpenSheet('archive'), { id: 'archive', type: 'action', label: 'Open Archive' })}
                    >
                        <Archive className="mr-2 h-4 w-4" />
                        <span>Open Archive</span>
                        <CommandShortcut>⌘3</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Projects">
                    <CommandItem
                        onSelect={() => runCommand(() => setActiveProject(null), { id: 'project-all', type: 'project', label: 'All Projects', payload: { projectId: null } })}
                    >
                        <Folder className="mr-2 h-4 w-4" />
                        <span>All Projects</span>
                    </CommandItem>
                    {projects.map((project) => (
                        <CommandItem
                            key={project.id}
                            onSelect={() => runCommand(() => setActiveProject(project.id), { id: `project-${project.id}`, type: 'project', label: project.name, payload: { projectId: project.id } })}
                            value={`project ${project.name}`}
                        >
                            <div
                                className="mr-2 h-3 w-3 rounded-full border"
                                style={{ backgroundColor: project.color }}
                            />
                            <span>{project.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Tasks">
                    {searchableTasks.slice(0, 10).map((task) => (
                        <CommandItem
                            key={task.id}
                            onSelect={() => runCommand(() => jumpToTask(task.id), { id: `task-${task.id}`, type: 'task', label: task.title, payload: { taskId: task.id } })}
                            value={task.title}
                        >
                            <span className="truncate">{task.title}</span>
                            {task.projectId && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                    in {projects.find(p => p.id === task.projectId)?.name}
                                </span>
                            )}
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Theme">
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme("light"), { id: 'theme-light', type: 'action', label: 'Theme: Light' })}
                        value="theme light"
                    >
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme("dark"), { id: 'theme-dark', type: 'action', label: 'Theme: Dark' })}
                        value="theme dark"
                    >
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme("system"), { id: 'theme-system', type: 'action', label: 'Theme: System' })}
                        value="theme system"
                    >
                        <Laptop className="mr-2 h-4 w-4" />
                        <span>System</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
