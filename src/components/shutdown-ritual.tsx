'use client';

import { useState, useMemo, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Moon, ArrowRight, CheckCircle2, TrendingUp, Lightbulb, Pickaxe, Crown } from 'lucide-react';
import { FormattedText } from './ui/formatted-text';
import { startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/sound-engine';

export function ShutdownRitual({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { tasks, updateTask, addTask } = useMonocleStore();
    const [step, setStep] = useState<'celebrate' | 'dump' | 'frog'>('celebrate');
    const [draftInput, setDraftInput] = useState('');
    
    // Derived values
    const { completedToday, candidateFrogs } = useMemo(() => {
        const todayStart = startOfDay(new Date()).getTime();
        
        const completed = tasks.filter(t => t.completedAt && t.completedAt >= todayStart);
        
        // Exclude drafts, waiting, done, and any current frogs
        const activeQueue = tasks
            .filter(t => t.status === 'todo' && !t.isDraft && !t.isFrog)
            .sort((a, b) => {
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (b.priority === 'high' && a.priority !== 'high') return 1;
                return 0;
            });
            
        return {
            completedToday: completed,
            candidateFrogs: activeQueue.slice(0, 5) // Show top 5 candidates
        };
    }, [tasks, open]); // Re-calculate when opened

    // Reset step when closed
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setTimeout(() => setStep('celebrate'), 300);
        }
        onOpenChange(newOpen);
    }

    if (!open) return null;

    const handleDraftSubmit = () => {
        if (!draftInput.trim()) return;
        addTask({
            id: crypto.randomUUID(),
            title: draftInput.trim(),
            status: 'todo',
            priority: 'medium',
            isDraft: true,
            createdAt: Date.now()
        });
        soundEngine.playAdd();
        setDraftInput('');
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleDraftSubmit();
        }
    };

    const handlePickFrog = (taskId: string) => {
        // Clear any existing frogs first
        tasks.forEach(t => {
            if (t.isFrog) updateTask(t.id, { isFrog: false });
        });
        
        updateTask(taskId, { isFrog: true });
        toast.success("Daily Frog set for tomorrow!");
        soundEngine.playComplete();
        handleOpenChange(false);
    };

    const nextStep = () => {
        if (step === 'celebrate') setStep('dump');
        else if (step === 'dump') setStep('frog');
        else handleOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Moon className="w-5 h-5 text-indigo-500" />
                        Evening Shutdown
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'celebrate' && "Take a moment to appreciate what got done today."}
                        {step === 'dump' && "Clear your mind. Any lingering thoughts for tomorrow?"}
                        {step === 'frog' && "Anoint tomorrow's Frog now, so you wake up with purpose."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 max-h-[50vh] overflow-y-auto overflow-x-hidden p-1 space-y-4">
                    {/* STEP 1: CELEBRATE */}
                    {step === 'celebrate' && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-500">
                            {completedToday.length === 0 ? (
                                <div className="text-center text-muted-foreground">
                                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>No tasks completed today.</p>
                                    <p className="text-xs mt-2 opacity-50">Tomorrow is a new day.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-4">
                                            <TrendingUp className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <h3 className="text-3xl font-bold text-foreground">{completedToday.length}</h3>
                                        <p className="text-sm text-balance text-muted-foreground uppercase tracking-widest font-semibold mt-1">Tasks Crushed</p>
                                    </div>
                                    <div className="w-full space-y-2">
                                        {completedToday.slice(0, 5).map(task => (
                                            <div key={task.id} className="text-sm bg-muted/50 p-3 rounded-lg flex items-center gap-3">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                <span className="truncate opacity-70 line-through"><FormattedText text={task.title} /></span>
                                            </div>
                                        ))}
                                        {completedToday.length > 5 && (
                                            <p className="text-xs text-center text-muted-foreground/50 italic pt-2">...and {completedToday.length - 5} more.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* STEP 2: BRAIN DUMP */}
                    {step === 'dump' && (
                        <div className="flex flex-col space-y-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 text-center">
                                <Lightbulb className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">Write down anything stressing you or unfinished ideas. Don't carry open loops to sleep!</p>
                            </div>
                            
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="I need to remember to..." 
                                    value={draftInput}
                                    onChange={e => setDraftInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="bg-muted focus-visible:ring-indigo-500"
                                />
                                <Button onClick={handleDraftSubmit} variant="secondary">Drop</Button>
                            </div>
                            
                        </div>
                    )}

                    {/* STEP 3: PICK TOMORROW'S FROG */}
                    {step === 'frog' && (
                        <div className="flex flex-col space-y-3 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                            {candidateFrogs.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Pickaxe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Your active queue is empty!</p>
                                    <p className="text-xs mt-2 opacity-50">Rest well.</p>
                                </div>
                            ) : (
                                candidateFrogs.map(task => (
                                    <div key={task.id} className="p-3 border rounded-xl flex items-center gap-3 hover:border-primary transition-colors cursor-pointer group" onClick={() => handlePickFrog(task.id)}>
                                        <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-green-500/20 flex items-center justify-center transition-colors shrink-0">
                                            <Crown className="w-4 h-4 text-muted-foreground group-hover:text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate"><FormattedText text={task.title} /></p>
                                            <div className="flex gap-2 mt-1">
                                                {task.priority === 'high' && <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">High Priority</span>}
                                                {task.duration && <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{task.duration}M</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center sm:justify-between w-full pt-4">
                    <div className="flex gap-1.5 pl-2">
                        <div className={`w-2 h-2 rounded-full transition-colors ${step === 'celebrate' ? 'bg-indigo-500' : 'bg-muted'}`} />
                        <div className={`w-2 h-2 rounded-full transition-colors ${step === 'dump' ? 'bg-indigo-500' : 'bg-muted'}`} />
                        <div className={`w-2 h-2 rounded-full transition-colors ${step === 'frog' ? 'bg-indigo-500' : 'bg-muted'}`} />
                    </div>
                    <Button onClick={nextStep} variant={step === 'frog' ? "secondary" : "default"}>
                        {step === 'frog' ? 'Skip & Finish' : 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
