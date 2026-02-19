'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useMonocleStore } from '@/lib/store';
import { Plus } from 'lucide-react';

export function AddTask() {
    const [title, setTitle] = useState('');
    const { addTask, activeProject } = useMonocleStore();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && title.trim()) {
            e.preventDefault();
            const isDraft = e.shiftKey;

            addTask({
                id: crypto.randomUUID(),
                title: title.trim(),
                status: 'todo',
                priority: 'medium',
                projectId: activeProject || undefined,
                isDraft,
                createdAt: Date.now(),
            });
            setTitle('');
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <Plus className="h-6 w-6" />
            </div>
            <Input
                placeholder="Add task... (Shift+Enter for Idea Dump)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-lg py-8 pl-14 pr-6 rounded-2xl border-2 shadow-sm focus-visible:ring-0 focus-visible:border-primary transition-all bg-background/50 backdrop-blur-sm"
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-2 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                <span className="text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">Shift+Enter = Draft</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-background/80 px-1 rounded">Enter = Task</span>
            </div>
        </div>
    );
}
