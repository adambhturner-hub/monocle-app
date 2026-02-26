'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useMonocleStore } from '@/lib/store';
import { Plus, Folder } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';

export function AddTask() {
    const [title, setTitle] = useState('');
    const { addTask, activeProject, projects } = useMonocleStore();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProject);

    useEffect(() => {
        setSelectedProjectId(activeProject);
    }, [activeProject]);

    const selectedProjectData = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && title.trim()) {
            e.preventDefault();
            const isDraft = e.shiftKey;

            addTask({
                id: crypto.randomUUID(),
                title: title.trim(),
                status: 'todo',
                priority: 'medium',
                projectId: selectedProjectId || undefined,
                isDraft,
                createdAt: Date.now(),
            });
            setTitle('');
            setSelectedProjectId(activeProject);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto relative group">
            <div className="absolute inset-y-0 left-2 flex items-center z-10 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors">
                            {selectedProjectData ? (
                                <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded-md" style={{ backgroundColor: selectedProjectData.color }}>
                                    {(() => {
                                        const IconCmp = getIconComponent(selectedProjectData.icon);
                                        return <IconCmp className="h-3.5 w-3.5 text-white drop-shadow-sm" />;
                                    })()}
                                </div>
                            ) : (
                                <Folder className="h-6 w-6 opacity-60" />
                            )}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 p-1">
                        <div className="text-[10px] font-bold px-2 py-1.5 text-muted-foreground uppercase tracking-widest mb-1">
                            Assign Project
                        </div>
                        <button
                            onClick={() => setSelectedProjectId(null)}
                            className={cn(
                                "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors",
                                selectedProjectId === null && "bg-secondary text-primary font-medium"
                            )}
                        >
                            <Folder className="h-4 w-4 text-muted-foreground" />
                            All Projects (Inbox)
                        </button>
                        {projects.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProjectId(p.id)}
                                className={cn(
                                    "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors",
                                    selectedProjectId === p.id && "bg-secondary text-primary font-medium"
                                )}
                            >
                                <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: p.color }}>
                                    {(() => {
                                        const IconCmp = getIconComponent(p.icon);
                                        return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                    })()}
                                </div>
                                <span className="truncate">{p.name}</span>
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            </div>
            <Input
                placeholder="Add task... (Shift+Enter for Idea Dump)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={255}
                className="text-lg py-8 pl-14 pr-6 rounded-2xl border-2 shadow-sm focus-visible:ring-0 focus-visible:border-primary transition-all bg-background/50 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-2 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                <span className="text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">Shift+Enter = Draft</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">Enter = Task</span>
            </div>
        </div>
    );
}
