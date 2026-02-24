'use client';

import { useMonocleStore } from '@/lib/store';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { toast } from "sonner";
import { Edit2, FileText, CornerUpLeft } from "lucide-react";
import { AddTaskModal } from './add-task-modal';
import { useState } from 'react';
import { Task } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { FormattedText } from './ui/formatted-text';

export function ArchiveView() {
    const { tasks, restoreTask, deleteTask, purgeArchivedTasks, activeSheet, setOpenSheet, undo } = useMonocleStore();

    const archivedTasks = tasks
        .filter(t => t.status === 'done')
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

    const handleRestore = (id: string) => {
        restoreTask(id);
        toast("Task restored", {
            action: {
                label: "Undo",
                onClick: () => undo()
            }
        });
    };

    const handleDeleteForever = (id: string) => {
        deleteTask(id);
        toast("Task permanently deleted");
    };

    const [purgeDuration, setPurgeDuration] = useState<'7' | '30' | '90' | 'all'>('30');

    const handlePurge = () => {
        const days = purgeDuration === 'all' ? 'all' : parseInt(purgeDuration);
        purgeArchivedTasks(days);

        let msg = "Purged all logged tasks";
        if (purgeDuration !== 'all') msg = `Purged tasks older than ${purgeDuration} days`;

        toast("Logbook purged", {
            description: msg,
            action: {
                label: "Undo",
                onClick: () => undo()
            }
        });
    };

    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [editModalOpen, setEditModalOpen] = useState(false);

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setEditModalOpen(true);
    };

    return (
        <Sheet open={activeSheet === 'archive'} onOpenChange={(val) => setOpenSheet(val ? 'archive' : null)}>
            {/* SheetTrigger removed as it is controlled via store */}
            <SheetContent side="left" className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader className="pb-6 mb-0">
                    <SheetTitle className="flex items-center justify-between">
                        <span>Logbook ({archivedTasks.length})</span>
                    </SheetTitle>
                    {archivedTasks.length > 0 && (
                        <div className="flex justify-end pt-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="xs"
                                        title="Purge tasks older than 30 days"
                                    >
                                        Purge Old
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Purge Old Tasks?</AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-4 pt-2">
                                            <p>This will permanently delete logged tasks. This action cannot be easily undone (except via immediate Undo).</p>

                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-foreground">Delete tasks older than:</span>
                                                <Select value={purgeDuration} onValueChange={(val: any) => setPurgeDuration(val)}>
                                                    <SelectTrigger className="w-[120px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="7">7 Days</SelectItem>
                                                        <SelectItem value="30">30 Days</SelectItem>
                                                        <SelectItem value="90">90 Days</SelectItem>
                                                        <SelectItem value="all">All Time</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handlePurge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Purge</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 pb-12">
                        {archivedTasks.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8 italic">
                                Logbook is empty.
                            </div>
                        ) : (
                            archivedTasks.map(task => (
                                <ContextMenu key={task.id}>
                                    <ContextMenuTrigger>
                                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col gap-2 group hover:bg-muted transition-colors select-none">
                                            <div className="flex items-start justify-between">
                                                <span className="font-medium line-through text-muted-foreground decoration-muted-foreground/50"><FormattedText text={task.title} /></span>
                                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-background hover:text-primary" onClick={(e) => { e.stopPropagation(); handleRestore(task.id); }} title="Restore">
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-background" title="Delete Forever" onClick={(e) => e.stopPropagation()}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete "{task.title}".
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteForever(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex justify-between items-center">
                                                <span>Completed {task.completedAt ? formatDistanceToNow(task.completedAt, { addSuffix: true }) : 'Unknown'}</span>
                                                {task.projectId && (
                                                    <span className="px-2 py-0.5 rounded-full bg-background border text-[10px]">{task.projectId}</span>
                                                )}
                                            </div>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem onClick={() => handleRestore(task.id)}>
                                            <RotateCcw className="mr-2 h-4 w-4" /> Restore
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => handleEdit(task)}>
                                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                                        </ContextMenuItem>
                                        <ContextMenuItem onClick={() => useMonocleStore.getState().duplicateTask(task.id)}>
                                            <FileText className="mr-2 h-4 w-4" /> Duplicate
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem onClick={() => handleDeleteForever(task.id)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <AddTaskModal
                    taskToEdit={editingTask}
                    open={editModalOpen}
                    onOpenChange={setEditModalOpen}
                />
            </SheetContent>
        </Sheet>
    );

}
