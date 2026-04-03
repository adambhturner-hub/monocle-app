'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMonocleStore } from '@/lib/store';
import { TimeBlock, Task } from '@/types';
import { cn, generateId } from '@/lib/utils';
import { format, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const HOUR_HEIGHT = 80; // pixels per hour
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function PlannerView() {
    const timeBlocks = useMonocleStore(state => state.timeBlocks || []);
    const tasks = useMonocleStore(state => state.tasks);
    const projects = useMonocleStore(state => state.projects);
    
    // Actions
    const addTimeBlock = useMonocleStore(state => state.addTimeBlock);
    const updateTimeBlock = useMonocleStore(state => state.updateTimeBlock);
    const deleteTimeBlock = useMonocleStore(state => state.deleteTimeBlock);
    
    const [currentDate, setCurrentDate] = useState<number>(startOfDay(new Date()).getTime());

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftStartTime, setDraftStartTime] = useState(540); // Default 9 AM
    const [draftDuration, setDraftDuration] = useState(60);
    const [draftTaskId, setDraftTaskId] = useState<string | undefined>(undefined);

    const draftTimeStr = useMemo(() => {
        const h = Math.floor(draftStartTime / 60);
        const m = draftStartTime % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }, [draftStartTime]);

    const blocksToday = useMemo(() => {
        return timeBlocks.filter(b => isSameDay(new Date(b.date), new Date(currentDate)));
    }, [timeBlocks, currentDate]);

    const activeTasks = useMemo(() => {
        return tasks.filter(t => t.status !== 'done' && t.status !== 'waiting' && !t.isDraft);
    }, [tasks]);

    // Custom Drag and Resize State
    const [actionState, setActionState] = useState<{ 
        type: 'drag' | 'resize', 
        id: string, 
        startY: number, 
        startVal: number 
    } | null>(null);

    const [liveUpdate, setLiveUpdate] = useState<{ startTime?: number, duration?: number } | null>(null);

    useEffect(() => {
        if (!actionState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - actionState.startY;
            const deltaMinutes = Math.round((deltaY / MINUTE_HEIGHT) / 15) * 15;

            if (actionState.type === 'drag') {
                const newStartTime = Math.max(0, actionState.startVal + deltaMinutes);
                setLiveUpdate({ startTime: newStartTime, duration: undefined });
            } else if (actionState.type === 'resize') {
                const newDuration = Math.max(15, actionState.startVal + deltaMinutes);
                setLiveUpdate({ duration: newDuration, startTime: undefined });
            }
        };

        const handleMouseUp = () => {
            // Because liveUpdate sits in closure of useEffect if not in dependencies properly,
            // we use a trick or guarantee it's updated directly.
            // Wait, liveUpdate is a dependency. BUT setState runs asynchronously. 
            // The cleanest way is to use a mutable ref for live values to prevent resetting the listener repeatedly, 
            // but since React handles re-binding fine with use-effect deps, we'll flush the final tracked state.
            setActionState(prev => {
                if (prev) {
                    // Update state. Use a slight timeout to ensure liveUpdate was caught if needed, or better, 
                    // we actually rely on the very last liveUpdate we have access to via a ref.
                    // Instead of full ref refactoring, we'll just check liveUpdate.
                }
                return prev;
            });
        };
        // We'll update the logic inside. see below.
    }, []);

    // Actually, let's use a standard ref approach for seamless event listeners without thrashing:
    const actionRef = useRef(actionState);
    const liveRef = useRef(liveUpdate);
    
    useEffect(() => {
        actionRef.current = actionState;
        liveRef.current = liveUpdate;
    }, [actionState, liveUpdate]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const act = actionRef.current;
            if (!act) return;

            const deltaY = e.clientY - act.startY;
            const deltaMinutes = Math.round((deltaY / MINUTE_HEIGHT) / 15) * 15;

            if (act.type === 'drag') {
                const newStartTime = Math.max(0, act.startVal + deltaMinutes);
                setLiveUpdate({ startTime: newStartTime });
            } else if (act.type === 'resize') {
                const newDuration = Math.max(15, act.startVal + deltaMinutes);
                setLiveUpdate({ duration: newDuration });
            }
        };

        const handleMouseUp = () => {
            const act = actionRef.current;
            const live = liveRef.current;
            
            if (act && live) {
                if (act.type === 'drag' && live.startTime !== undefined) {
                    updateTimeBlock(act.id, { startTime: live.startTime });
                } else if (act.type === 'resize' && live.duration !== undefined) {
                    updateTimeBlock(act.id, { duration: live.duration });
                }
            }
            
            setActionState(null);
            setLiveUpdate(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [updateTimeBlock]);


    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (actionState) return; // Prevent click if dragging
        // Find click position relative to the grid wrapper
        const bounds = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - bounds.top;
        
        // Calculate minutes based on Y coordinate
        let clickedMinutes = Math.floor(y / MINUTE_HEIGHT);
        // Snap to nearest 15 minutes
        clickedMinutes = Math.round(clickedMinutes / 15) * 15;
        
        openModal(null, clickedMinutes);
    };

    const openModal = (blockId: string | null = null, defaultStartTime: number = 540) => {
        if (blockId) {
            const block = timeBlocks.find(b => b.id === blockId);
            if (block) {
                setEditingBlockId(block.id);
                setDraftTitle(block.title);
                setDraftStartTime(block.startTime);
                setDraftDuration(block.duration);
                setDraftTaskId(block.taskId);
            }
        } else {
            setEditingBlockId(null);
            setDraftTitle('');
            setDraftStartTime(defaultStartTime);
            setDraftDuration(60);
            setDraftTaskId(undefined);
        }
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!draftTitle.trim() && !draftTaskId) return;

        if (editingBlockId) {
            updateTimeBlock(editingBlockId, {
                title: draftTitle,
                startTime: draftStartTime,
                duration: draftDuration,
                taskId: draftTaskId
            });
        } else {
            const block: TimeBlock = {
                id: generateId(),
                date: currentDate,
                title: draftTitle,
                startTime: draftStartTime,
                duration: draftDuration,
                taskId: draftTaskId,
                createdAt: Date.now(),
            } as TimeBlock & { createdAt: number }; // casting as we don't strictly need createdAt in schema but nice to have
            addTimeBlock(block);
        }
        setModalOpen(false);
    };

    const handleDelete = () => {
        if (editingBlockId) {
            deleteTimeBlock(editingBlockId);
            setModalOpen(false);
        }
    };

    // Helper to format minutes as HH:MM
    const formatMinutes = (m: number) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setMinutes(m);
        return format(d, 'h:mm a');
    };

    // Calculate left offset based on overlaps (simple algorithm for MVP)
    // To do true Google-Cal width splitting, it's complex. For now, simple absolute overlapping.
    
    return (
        <div className="flex flex-col h-full bg-background relative max-w-full overflow-hidden safe-area-inset-top">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-tight">Planner</h2>
                        <div className="flex items-center text-xs text-muted-foreground font-medium">
                           {format(currentDate, 'EEEE, MMMM d')}
                           {isSameDay(currentDate, new Date()) && <span className="ml-2 text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase text-[9px] font-bold">Today</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1).getTime())}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(startOfDay(new Date()).getTime())}>
                        Today
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1).getTime())}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex-1 overflow-y-auto w-full relative pb-40 planner-scroll">
                <div className="flex">
                    {/* Time Axis */}
                    <div className="w-[60px] shrink-0 border-r border-border/30 bg-background z-10 sticky left-0 py-4">
                        {HOURS.map(hour => (
                            <div key={hour} className="relative w-full flex justify-end pr-2" style={{ height: HOUR_HEIGHT }}>
                                <span className="text-[10px] font-semibold text-muted-foreground/60 transform -translate-y-1/2">
                                    {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Area */}
                    <div 
                        className="flex-1 relative pb-4 py-4 min-w-0" 
                        style={{ height: (24 * HOUR_HEIGHT) + 32 }}
                        onClick={handleGridClick}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            try {
                                const dataStr = e.dataTransfer.getData('application/json');
                                if (!dataStr) return;
                                
                                const data = JSON.parse(dataStr);
                                if (!data.taskId) return;

                                const bounds = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - bounds.top;
                                
                                let droppedMinutes = Math.floor(y / MINUTE_HEIGHT);
                                droppedMinutes = Math.max(0, Math.round(droppedMinutes / 15) * 15);

                                addTimeBlock({
                                    id: generateId(),
                                    date: currentDate,
                                    title: data.title || '',
                                    startTime: droppedMinutes,
                                    duration: 60,
                                    taskId: data.taskId,
                                    createdAt: Date.now(),
                                } as TimeBlock & { createdAt?: number });
                            } catch (err) {
                                console.error("Drop parsing failed", err);
                            }
                        }}
                    >
                        {/* Grid Lines */}
                        {HOURS.map(hour => (
                            <div key={hour} className="absolute left-0 right-0 border-t border-border/20 pointer-events-none" style={{ top: (hour * HOUR_HEIGHT) + 16 }} />
                        ))}
                        {HOURS.map(hour => (
                            <div key={`half-${hour}`} className="absolute left-0 right-0 border-t border-border/10 border-dashed pointer-events-none" style={{ top: (hour * HOUR_HEIGHT) + 16 + (HOUR_HEIGHT / 2) }} />
                        ))}

                        {/* Blocks */}
                        {blocksToday.map(block => {
                            // Find linked task if applicable
                            const linkedTask = block.taskId ? tasks.find(t => t.id === block.taskId) : null;
                            const project = linkedTask?.projectId ? projects.find(p => p.id === linkedTask.projectId) : null;
                            const displayTitle = linkedTask ? linkedTask.title : block.title;
                            const color = block.color || project?.color || '#3b82f6'; // default blue
                            const isLive = actionState?.id === block.id;

                            return (
                                <div
                                    key={block.id}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // prevent text selection
                                        e.stopPropagation();
                                        setActionState({ type: 'drag', id: block.id, startY: e.clientY, startVal: block.startTime });
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!actionState) {
                                            openModal(block.id);
                                        }
                                    }}
                                    className={cn(
                                        "absolute left-2 right-4 rounded-[6px] p-2 hover:brightness-110 shadow-sm border border-black/10 overflow-hidden cursor-move transition-transform active:scale-[0.98] group",
                                        actionState?.id === block.id ? "z-50 opacity-90 scale-[1.02] shadow-xl" : "z-10"
                                    )}
                                    style={{
                                        top: ((isLive && liveUpdate?.startTime !== undefined ? liveUpdate.startTime : block.startTime) * MINUTE_HEIGHT) + 16,
                                        height: Math.max((isLive && liveUpdate?.duration !== undefined ? liveUpdate.duration : block.duration) * MINUTE_HEIGHT, 24),
                                        backgroundColor: color,
                                        color: '#ffffff',
                                    }}
                                >
                                    {/* Subdued background tint pattern */}
                                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                                    
                                    <div className="relative z-10 flex flex-col h-full leading-tight pointer-events-none">
                                        <div className="flex items-center gap-1 opacity-80 text-[10px] font-medium tracking-wide">
                                            {formatMinutes(isLive && liveUpdate?.startTime !== undefined ? liveUpdate.startTime : block.startTime)}
                                            {linkedTask && <span className="opacity-70 ml-auto flex items-center"><GripVertical className="h-3 w-3 inline" /> Task</span>}
                                        </div>
                                        <div className="text-xs font-bold line-clamp-2 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                            {displayTitle}
                                        </div>
                                    </div>

                                    {/* Resize Handle */}
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-all rounded-b-[6px]"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setActionState({ type: 'resize', id: block.id, startY: e.clientY, startVal: block.duration });
                                        }}
                                    >
                                        <div className="w-8 h-1 rounded-full bg-white/40" />
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Current Time Indicator (only on today) */}
                        {isSameDay(currentDate, new Date()) && (
                            <div 
                                className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                style={{ 
                                    top: ((new Date().getHours() * 60 + new Date().getMinutes()) * MINUTE_HEIGHT) + 16
                                }}
                            >
                                <div className="absolute left-[-4px] top-[-5px] h-2 w-2 rounded-full bg-red-500" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Editing Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingBlockId ? 'Edit Time Block' : 'Add Time Block'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Link to Task (Optional)</Label>
                            <select 
                                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={draftTaskId || ''}
                                onChange={(e) => setDraftTaskId(e.target.value || undefined)}
                            >
                                <option value="">-- No Task (Placeholder) --</option>
                                {activeTasks.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>

                        {!draftTaskId && (
                            <div className="space-y-2">
                                <Label>Title / Label</Label>
                                <Input 
                                    value={draftTitle} 
                                    onChange={(e) => setDraftTitle(e.target.value)} 
                                    placeholder="E.g., Commute, Workout..." 
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input 
                                    type="time" 
                                    value={draftTimeStr} 
                                    onChange={(e) => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        if (!isNaN(h) && !isNaN(m)) setDraftStartTime(h * 60 + m);
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (Minutes)</Label>
                                <Input 
                                    type="number" 
                                    min={5}
                                    step={5}
                                    value={draftDuration} 
                                    onChange={(e) => setDraftDuration(parseInt(e.target.value) || 60)} 
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between items-center w-full">
                        {editingBlockId ? (
                            <Button variant="destructive" size="icon" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : <div />}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={!draftTaskId && !draftTitle.trim()}>Save</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
