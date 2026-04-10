'use client';

import { useState, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, Trash2, Archive, Calendar, ArrowRight, CornerUpLeft, Crown, Clock } from 'lucide-react';
import { FormattedText } from './ui/formatted-text';
import { format, startOfDay, isToday } from 'date-fns';
import { getIconComponent } from '@/lib/icons';
import { toast } from 'sonner';

export function ReviewRitual({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { tasks, projects, updateTask, deleteTask, toggleDraft, promoteTask, toggleFrog, setLastReviewDate } = useMonocleStore();
    
    const [step, setStep] = useState<'dormant' | 'stale' | 'ideas'>('dormant');
    const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

    // Derived states for review
    const { dormantTasks, staleTasks, ideas } = useMemo(() => {
        const now = Date.now();
        
        const isExcluded = (projectId?: string) => {
            if (!projectId) return false;
            const project = projects.find(p => p.id === projectId);
            return !!project?.excludeFromQueue;
        };

        const active = tasks.filter(t => t.status === 'todo' && !t.isOngoing && !t.isDraft && !t.isFrog && !t.archivedAt && !t.completedAt && !isExcluded(t.projectId));
        const waiting = tasks.filter(t => t.status === 'waiting' && !isExcluded(t.projectId));
        const draft = tasks.filter(t => t.isDraft && t.status === 'todo' && !isExcluded(t.projectId));

        const dueTasks = tasks.filter(t => 
            (t.status === 'waiting' || t.status === 'todo') && 
            !t.isDraft && !t.isFrog && !t.archivedAt && !t.completedAt && 
            t.launchDate && 
            startOfDay(t.launchDate).getTime() <= startOfDay(now).getTime() &&
            !acknowledgedIds.has(t.id) &&
            !isExcluded(t.projectId)
        );

        return {
            dormantTasks: dueTasks, // Ready to wake up
            staleTasks: active.filter(t => !t.launchDate && !acknowledgedIds.has(t.id) && Math.floor((now - t.createdAt) / 86400000) >= 14).slice(0, 5), // Max 5 stale queue items
            ideas: draft.filter(t => !acknowledgedIds.has(t.id) && Math.floor((now - t.createdAt) / 86400000) >= 30).slice(0, 3) // Extremely old ideas
        }
    }, [tasks, projects, acknowledgedIds]);
    
    // Auto-advance logic if current step is empty
    const currentQueue = step === 'dormant' ? dormantTasks : step === 'stale' ? staleTasks : ideas;

    if (!open) return null;

    const handleAction = (taskId: string, action: 'keep' | 'promote' | 'dump' | 'delete' | 'make_frog') => {
        setAcknowledgedIds(prev => new Set([...prev, taskId]));

        if (action === 'keep') {
            if (step === 'dormant') {
                const targetTask = tasks.find(t => t.id === taskId);
                if (targetTask?.status === 'waiting') {
                    updateTask(taskId, { status: 'todo' });
                }
            }
        } else if (action === 'promote') {
            if (step === 'dormant') {
                const targetTask = tasks.find(t => t.id === taskId);
                if (targetTask?.status === 'waiting') {
                    updateTask(taskId, { status: 'todo' });
                }
            }
            promoteTask(taskId);
        } else if (action === 'make_frog') {
            if (step === 'dormant') {
                const targetTask = tasks.find(t => t.id === taskId);
                if (targetTask?.status === 'waiting') {
                    updateTask(taskId, { status: 'todo' });
                }
            }
            toggleFrog(taskId);
        } else if (action === 'dump') {
            toggleDraft(taskId);
        } else if (action === 'delete') {
            deleteTask(taskId);
        }
        toast("Task updated");
    };

    const nextStep = () => {
        if (step === 'dormant') setStep('stale');
        else if (step === 'stale') setStep('ideas');
        else {
            setLastReviewDate(new Date().toISOString().split('T')[0]);
            onOpenChange(false); // Finished
        }
    };

    const skipAll = () => {
        nextStep();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-full sm:h-auto max-h-[100dvh] p-0 gap-0 overflow-hidden flex flex-col bg-muted/30">
                <DialogHeader className="pt-8 pb-4 px-6 bg-background border-b shrink-0 space-y-3">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> 
                        Morning Review
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        {step === 'dormant' && "These tasks woke up today. Prioritize them?"}
                        {step === 'stale' && "These items have been sitting in your Queue for over 2 weeks."}
                        {step === 'ideas' && "These ideas are getting old. Time to let go?"}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto px-6">
                    {currentQueue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nothing to review here!</p>
                        </div>
                    ) : (
                        currentQueue.map(task => {
                            const proj = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                            const IconCmp = proj ? getIconComponent(proj.icon) : null;

                            return (
                                <div key={task.id} className="p-4 rounded-xl border bg-card space-y-3">
                                    <div className="flex items-start gap-3">
                                        {IconCmp && (
                                            <div className="flex justify-center items-center shrink-0 w-6 h-6 rounded-md mt-0.5" style={{ backgroundColor: proj?.color }}>
                                                <IconCmp className="h-3.5 w-3.5 text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-tight">
                                                <FormattedText text={task.title} />
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {step === 'dormant' ? (
                                                    task.launchDate ? 
                                                        (isToday(task.launchDate) ? "Woke up today" : `Woke up ${format(task.launchDate, 'MMM d')}`)
                                                    : 'Woke up today'
                                                ) : `Created ${format(task.createdAt, 'MMM d, yyyy')}`}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                                        {step === 'dormant' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20" onClick={() => handleAction(task.id, 'make_frog')} title="Make Daily Frog">
                                                    <Crown className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20" onClick={() => handleAction(task.id, 'promote')} title="Push to Top">
                                                    <ArrowRight className="w-4 h-4 -rotate-90" />
                                                </Button>
                                                <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => handleAction(task.id, 'keep')}>
                                                    Leave in Queue
                                                </Button>
                                            </>
                                        )}
                                        {step === 'stale' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20" onClick={() => handleAction(task.id, 'delete')} title="Delete"><Trash2 className="w-4 h-4" /></Button>
                                                <Button size="icon" variant="ghost" className="text-amber-500 hover:text-amber-600 bg-amber-500/10 hover:bg-amber-500/20" onClick={() => handleAction(task.id, 'dump')} title="Demote to Idea"><Archive className="w-4 h-4" /></Button>
                                                <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => handleAction(task.id, 'promote')}>
                                                    Push to Top
                                                </Button>
                                            </>
                                        )}
                                        {step === 'ideas' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20" onClick={() => handleAction(task.id, 'delete')} title="Trash Idea"><Trash2 className="w-4 h-4" /></Button>
                                                <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => handleAction(task.id, 'promote')}>
                                                    Upgrade to Task
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="flex items-center sm:justify-between w-full">
                    <div className="flex gap-1">
                        <div className={`w-2 h-2 rounded-full ${step === 'dormant' ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`w-2 h-2 rounded-full ${step === 'stale' ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`w-2 h-2 rounded-full ${step === 'ideas' ? 'bg-primary' : 'bg-muted'}`} />
                    </div>
                    <Button onClick={nextStep}>
                        {step === 'ideas' ? 'Finish Review' : 'Skip & Next'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
