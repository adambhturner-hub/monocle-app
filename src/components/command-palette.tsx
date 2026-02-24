
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
import { getIconComponent } from '@/lib/icons';
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
        startSession
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
            // Standard Cmd+K
            if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    // Filter tasks for search (exclude done)
    const searchableTasks = tasks.filter((t: any) => !t.isDraft && t.status !== 'done');

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Actions">
                    <CommandItem
                        onSelect={() => runCommand(() => setView('capture'))}
                    >
                        <Zap className="mr-2 h-4 w-4" />
                        <span>Capture Task</span>
                        <CommandShortcut>⌘K</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setView('focus'))}
                    >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        <span>Go to Focus Mode</span>
                        <CommandShortcut>F</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setView('queue'))}
                    >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Go to Queue</span>
                        <CommandShortcut>Q</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setView('ideas'))}
                    >
                        <Archive className="mr-2 h-4 w-4" />
                        <span>Idea Dump</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setOpenSheet('settings'))}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Open Settings</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Projects">
                    <CommandItem
                        onSelect={() => runCommand(() => setActiveProject(null))}
                    >
                        <Folder className="mr-2 h-4 w-4" />
                        <span>All Projects</span>
                    </CommandItem>
                    {projects.map((project: any) => (
                        <CommandItem
                            key={project.id}
                            onSelect={() => runCommand(() => setActiveProject(project.id))}
                            value={`project ${project.name}`}
                        >
                            <div
                                className="mr-2 flex items-center justify-center shrink-0 w-4 h-4 rounded-sm"
                                style={{ backgroundColor: project.color }}
                            >
                                {(() => {
                                    const IconCmp = getIconComponent(project.icon);
                                    return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                })()}
                            </div>
                            <span>{project.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Tasks">
                    {searchableTasks.slice(0, 10).map((task: any) => (
                        <CommandItem
                            key={task.id}
                            onSelect={() => runCommand(() => {
                                // Jump to task isn't in store, so just switch to queue
                                setView('queue');
                            })}
                            value={task.title}
                        >
                            <span className="truncate">{task.title}</span>
                            {task.projectId && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                    in {projects.find((p: any) => p.id === task.projectId)?.name}
                                </span>
                            )}
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Theme">
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme("light"))}
                        value="theme light"
                    >
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme("dark"))}
                        value="theme dark"
                    >
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme("system"))}
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
