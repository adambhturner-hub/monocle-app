'use client';

import { useState, useMemo } from 'react';
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

    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
                            
                            return (
                                <div
                                    key={block.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openModal(block.id);
                                    }}
                                    className="absolute left-2 right-4 rounded-[6px] p-2 hover:brightness-110 shadow-sm border border-black/10 overflow-hidden cursor-pointer transition-transform active:scale-[0.98] group"
                                    style={{
                                        top: (block.startTime * MINUTE_HEIGHT) + 16,
                                        height: Math.max(block.duration * MINUTE_HEIGHT, 24),
                                        backgroundColor: color,
                                        color: '#ffffff',
                                    }}
                                >
                                    {/* Subdued background tint pattern */}
                                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                                    
                                    <div className="relative z-10 flex flex-col h-full leading-tight">
                                        <div className="flex items-center gap-1 opacity-80 text-[10px] font-medium tracking-wide">
                                            {formatMinutes(block.startTime)}
                                            {linkedTask && <span className="opacity-70 ml-auto flex items-center"><GripVertical className="h-3 w-3 inline" /> Task</span>}
                                        </div>
                                        <div className="text-xs font-bold line-clamp-2 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                            {displayTitle}
                                        </div>
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
