'use client';

import { useMemo, useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Project } from '@/types';
import { FormattedText } from './ui/formatted-text';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { CheckCircle2, CornerUpLeft, Edit2, Archive, Trash2, Folder, Split, Lightbulb, Hourglass, ArrowUpCircle } from 'lucide-react';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { AddTaskModal } from './add-task-modal';
import { SubdivideTaskModal } from './subdivide-task-modal';

export function BoardView() {
    const { tasks, projects, setTask, updateTask, completeTask, archiveTask, deleteTask, getAutoPickedTask, jumpTaskToTop } = useMonocleStore();
    const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [taskToSubdivide, setTaskToSubdivide] = useState<Task | null>(null);

    const activeTasks = useMemo(() => {
        return tasks.filter(t => !t.isDraft && t.status === 'todo');
    }, [tasks]);

    const columns = useMemo(() => {
        const cols: { id: string, title: string, project: Project | null, tasks: Task[] }[] = [];

        projects.forEach(p => {
            cols.push({
                id: p.id,
                title: p.name,
                project: p,
                tasks: activeTasks.filter(t => t.projectId === p.id)
            });
        });

        // Uncategorized
        cols.push({
            id: 'uncategorized',
            title: 'Uncategorized',
            project: null,
            tasks: activeTasks.filter(t => !t.projectId)
        });

        return cols;
    }, [projects, activeTasks]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        const task = tasks.find(t => t.id === draggableId);
        if (!task) return;

        const destProjectId = destination.droppableId === 'uncategorized' ? null : destination.droppableId;
        const srcProjectId = source.droppableId === 'uncategorized' ? null : source.droppableId;

        // Create a new tasks array and reorder
        const newTasks = [...tasks];
        
        // Find task index in the overall tasks array
        const globalTaskIndex = newTasks.findIndex(t => t.id === draggableId);
        if (globalTaskIndex === -1) return;

        // If moving to a different project, update projectId
        if (destProjectId !== srcProjectId) {
            newTasks[globalTaskIndex] = { ...newTasks[globalTaskIndex], projectId: destProjectId as string | undefined };
        }

        const destColTasks = activeTasks.filter(t => (destProjectId ? t.projectId === destProjectId : !t.projectId));
        
        const [movedTask] = newTasks.splice(globalTaskIndex, 1);
        
        if (destColTasks.length === 0) {
            // Drop at the end of the new tasks array
            newTasks.push(movedTask);
        } else {
            // Find the task that is currently at the destination index
            // If dropping at the end of a column, index might be equal to destColTasks.length
            if (destination.index >= destColTasks.length) {
                // Drop after the last task in that column
                const lastTaskInCol = destColTasks[destColTasks.length - 1];
                const lastTaskGlobalIndex = newTasks.findIndex(t => t.id === lastTaskInCol.id);
                newTasks.splice(lastTaskGlobalIndex + 1, 0, movedTask);
            } else {
                // Drop before the task currently at the destination index
                const targetTask = destColTasks[destination.index];
                const targetTaskGlobalIndex = newTasks.findIndex(t => t.id === targetTask.id);
                newTasks.splice(targetTaskGlobalIndex, 0, movedTask);
            }
        }

        setTask(newTasks);
    };

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setEditModalOpen(true);
    };

    const currentActiveTask = getAutoPickedTask();

    return (
        <div className="w-full h-full flex flex-col pt-4 overflow-hidden">
            <DragDropContext onDragEnd={onDragEnd}>
                <ScrollArea className="flex-1 w-full whitespace-nowrap px-4" type="scroll">
                    <div className="flex gap-6 h-full items-start pb-8">
                        {columns.map(col => (
                            <div key={col.id} className="w-[320px] shrink-0 h-full flex flex-col bg-muted/30 rounded-xl border p-3 pt-4 overflow-hidden max-h-full">
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    {col.project ? (
                                        <>
                                            {(() => {
                                                const IconCmp = getIconComponent(col.project.icon);
                                                return <IconCmp className="w-4 h-4" style={{ color: col.project.color }} />;
                                            })()}
                                            <h3 className="font-bold text-sm" style={{ color: col.project.color }}>{col.title}</h3>
                                        </>
                                    ) : (
                                        <>
                                            <Folder className="w-4 h-4 text-muted-foreground" />
                                            <h3 className="font-bold text-sm text-muted-foreground">{col.title}</h3>
                                        </>
                                    )}
                                    <div className="ml-auto bg-background/50 rounded-full px-2 py-0.5 text-xs text-muted-foreground font-medium">
                                        {col.tasks.length}
                                    </div>
                                </div>

                                <Droppable droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={cn("flex-1 overflow-y-auto pr-2 pb-4 space-y-2 rounded-lg transition-colors min-h-[150px]", snapshot.isDraggingOver ? "bg-muted/50" : "")}
                                        >
                                            {col.tasks.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <ContextMenu>
                                                            <ContextMenuTrigger onDoubleClick={(e) => { e.preventDefault(); handleEdit(task); }}>
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={cn(
                                                                        "group bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-all whitespace-normal text-left",
                                                                        snapshot.isDragging && "shadow-lg scale-[1.02] rotate-1 ring-2 ring-primary/20",
                                                                        task.isFrog && "border-l-4 border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20",
                                                                        task.id === currentActiveTask?.id && !task.isFrog && "border-l-4 border-l-primary bg-primary/5 ring-1 ring-primary/20"
                                                                    )}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={cn(
                                                                                "text-sm font-medium line-clamp-3 leading-snug",
                                                                                task.id === currentActiveTask?.id && !task.isFrog && !task.isLightning && "text-primary font-bold",
                                                                                task.isFrog && "text-emerald-700 dark:text-emerald-400 font-bold",
                                                                                task.isLightning && !task.isFrog && "text-yellow-700 dark:text-yellow-400 font-bold"
                                                                            )}>
                                                                                <FormattedText text={task.title} />
                                                                            </p>
                                                                            {task.description && (
                                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                                                    {task.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="shrink-0 flex flex-col gap-1 items-center">
                                                                            {task.isFrog && <span className="text-sm leading-none" title="Frog">🐸</span>}
                                                                            {task.isLightning && !task.isFrog && <span className="text-sm leading-none" title="Lightning Task">⚡️</span>}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center justify-between mt-3 gap-2">
                                                                        <div className="flex gap-1">
                                                                            <Button variant="ghost" size="icon-xs" className="h-6 w-6 hover:bg-emerald-500/10 hover:text-emerald-500 rounded-full" onClick={(e) => { e.stopPropagation(); completeTask(task.id); }} title="Complete">
                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                        {task.priority === 'high' && <span className="text-[10px] font-bold text-red-500 uppercase">High</span>}
                                                                    </div>
                                                                </div>
                                                            </ContextMenuTrigger>
                                                            <ContextMenuContent>
                                                                <ContextMenuItem onClick={() => updateTask(task.id, { isFrog: !task.isFrog })}>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Toggle Frog
                                                                </ContextMenuItem>
                                                                <ContextMenuItem onClick={() => handleEdit(task)}><Edit2 className="mr-2 h-4 w-4" /> Edit</ContextMenuItem>
                                                                <ContextMenuItem onClick={() => setTaskToSubdivide(task)}><Split className="mr-2 h-4 w-4" /> Subdivide</ContextMenuItem>
                                                                <ContextMenuSeparator />
                                                                <ContextMenuItem onClick={() => jumpTaskToTop(task.id)}><ArrowUpCircle className="mr-2 h-4 w-4" /> Make Next</ContextMenuItem>
                                                                <ContextMenuItem onClick={() => updateTask(task.id, { status: 'waiting', isBlocked: !task.isBlocked })}><Hourglass className="mr-2 h-4 w-4" /> Toggle Blocked</ContextMenuItem>
                                                                <ContextMenuItem onClick={() => archiveTask(task.id)}><Archive className="mr-2 h-4 w-4" /> Archive</ContextMenuItem>
                                                                <ContextMenuSeparator />
                                                                <ContextMenuItem onClick={() => deleteTask(task.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>
                                                            </ContextMenuContent>
                                                        </ContextMenu>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </DragDropContext>
            
            <AddTaskModal
                taskToEdit={editingTask}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
            />
            {taskToSubdivide && (
                <SubdivideTaskModal
                    open={!!taskToSubdivide}
                    onOpenChange={(val) => !val && setTaskToSubdivide(null)}
                    task={taskToSubdivide}
                />
            )}
        </div>
    );
}
