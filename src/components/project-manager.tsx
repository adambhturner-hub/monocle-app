'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, Check, X, Palette } from 'lucide-react';
import { useMonocleStore } from '@/lib/store';
import { Project } from '@/types';
import { cn, generateId } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

interface ProjectManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

import { ConfirmationDialog } from '@/components/confirmation-dialog';

export function ProjectManager({ open, onOpenChange }: ProjectManagerProps) {
    const { projects, addProject, updateProject, deleteProject } = useMonocleStore();

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(COLORS[5]); // Default Blue

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleCreate = () => {
        if (!newName.trim()) return;
        const newProject: Project = {
            id: generateId(),
            name: newName.trim(),
            color: newColor,
        };
        addProject(newProject);
        setNewName('');
        setIsCreating(false);
    };

    const startEdit = (project: Project) => {
        setEditingId(project.id);
        setEditName(project.name);
        setEditColor(project.color);
    };

    const saveEdit = () => {
        if (!editingId || !editName.trim()) return;
        updateProject(editingId, { name: editName.trim(), color: editColor });
        setEditingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteProject(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:max-w-[500px] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-4 py-3 border-b bg-muted/10">
                    <DialogTitle>Manage Projects</DialogTitle>
                    <DialogDescription className="sr-only">
                        Create, edit, and delete projects.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {/* List */}
                    <div className="space-y-2">
                        {projects.map(project => (
                            <div key={project.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/50 border border-transparent hover:border-border/50 transition-colors">
                                {editingId === project.id ? (
                                    <div className="flex items-center gap-2 flex-1 animate-in fade-in zoom-in-95 duration-200">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="w-6 h-6 rounded-full border border-border shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 ring-primary/20" style={{ backgroundColor: editColor }} />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-fit p-2 grid grid-cols-5 gap-2">
                                                {COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        className={cn("w-6 h-6 rounded-full hover:scale-110 transition-transform", editColor === c && "ring-2 ring-offset-2 ring-primary")}
                                                        style={{ backgroundColor: c }}
                                                        onClick={() => setEditColor(c)}
                                                    />
                                                ))}
                                            </PopoverContent>
                                        </Popover>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-8 flex-1"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                        />
                                        <Button size="icon-xs" variant="ghost" onClick={saveEdit} className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon-xs" variant="ghost" onClick={cancelEdit} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                                            <span className="font-medium">{project.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon-xs" variant="ghost" onClick={() => startEdit(project)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="icon-xs" variant="ghost" onClick={() => setDeleteId(project.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {projects.length === 0 && !isCreating && (
                            <div className="text-center py-8 text-muted-foreground text-sm italic">
                                No projects yet. Create one to get organized!
                            </div>
                        )}
                    </div>

                    {/* Creation Form */}
                    {isCreating ? (
                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20 animate-in slide-in-from-top-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="w-6 h-6 rounded-full border border-border shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 ring-primary/20" style={{ backgroundColor: newColor }} />
                                </PopoverTrigger>
                                <PopoverContent className="w-fit p-2 grid grid-cols-5 gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            className={cn("w-6 h-6 rounded-full hover:scale-110 transition-transform", newColor === c && "ring-2 ring-offset-2 ring-primary")}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setNewColor(c)}
                                        />
                                    ))}
                                </PopoverContent>
                            </Popover>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Project Name"
                                className="h-9 flex-1"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <Button size="sm" onClick={handleCreate}>Create</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full justify-start text-muted-foreground hover:text-foreground border-dashed"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create New Project
                        </Button>
                    )}
                </div>
            </DialogContent>

            <ConfirmationDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Project?"
                description="This will remove the project from your list. Tasks associated with this project will be moved to 'All Projects' (Inbox)."
                confirmLabel="Delete Project"
                onConfirm={confirmDelete}
                variant="destructive"
            />
        </Dialog>
    );
}
