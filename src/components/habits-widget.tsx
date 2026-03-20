import React, { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Flame, Plus, Settings2, Trash2, Check, CheckCircle2 } from 'lucide-react';
import { isToday, startOfDay, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateId } from '@/lib/utils';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export function HabitsWidget() {
    const { habits, toggleHabit, addHabit, deleteHabit, addTask } = useMonocleStore();
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState('');

    const handleCreateHabit = (e: React.FormEvent) => {
        e.preventDefault();
        const title = newHabitTitle.trim();
        if (!title) return;

        addHabit({
            id: generateId(),
            title,
            streak: 0,
            createdAt: Date.now()
        });
        setNewHabitTitle('');
    };

    const handleToggle = (id: string, currentStreak: number, isCurrentlyCompleted: boolean) => {
        toggleHabit(id);
        if (!isCurrentlyCompleted) {
            const nextStreak = currentStreak + 1;
            if ([3, 7, 14, 30, 90, 365].includes(nextStreak)) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
    };

    const promoteToQueue = (title: string, isFrog: boolean) => {
        addTask({
            id: generateId(),
            title,
            status: 'todo',
            priority: isFrog ? 'high' : 'medium',
            createdAt: Date.now(),
            isDraft: false,
            isFrog
        });
    };

    if (habits.length === 0 && !isManagerOpen) {
        return (
            <div className="w-full mb-6">
                <Button 
                    variant="outline" 
                    className="w-full text-muted-foreground border-dashed h-12 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    onClick={() => setIsManagerOpen(true)}
                >
                    <Plus className="w-4 h-4" /> Add your first Daily Habit
                </Button>
                <HabitManagerModal open={isManagerOpen} onOpenChange={setIsManagerOpen} newTitle={newHabitTitle} setNewTitle={setNewHabitTitle} onCreate={handleCreateHabit} habits={habits} onDelete={deleteHabit} />
            </div>
        );
    }

    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const logicalNow = Date.now() - FOUR_HOURS_MS;
    const currentDayOfWeek = new Date(logicalNow).getDay();
    const activeHabits = habits.filter(habit => !habit.daysOfWeek || habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(currentDayOfWeek));

    return (
        <div className="w-full mb-6 relative group">
            <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                {activeHabits.map(habit => {
                    const today = startOfDay(logicalNow).getTime();
                    const lastCompletedLogical = habit.lastCompletedAt ? startOfDay(habit.lastCompletedAt - FOUR_HOURS_MS).getTime() : 0;
                    const completedToday = lastCompletedLogical === today;

                    return (
                        <ContextMenu key={habit.id}>
                            <ContextMenuTrigger asChild>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleToggle(habit.id, habit.streak, completedToday)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all snap-start shrink-0 select-none cursor-pointer border",
                                        completedToday 
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-sm" 
                                            : "bg-transparent border-transparent text-muted-foreground opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-3.5 h-3.5 rounded-full border transition-colors shrink-0",
                                        completedToday ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 bg-transparent"
                                    )}>
                                        {completedToday && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    
                                    <span className={cn(
                                        "text-[13px] whitespace-nowrap",
                                        completedToday ? "font-bold" : "font-medium"
                                    )}>
                                        {habit.title}
                                    </span>

                                    {habit.daysOfWeek && habit.daysOfWeek.length > 0 && habit.daysOfWeek.length < 7 && (
                                        <span className={cn(
                                            "text-[10px] ml-0.5 tracking-tighter uppercase font-bold",
                                            completedToday ? "text-emerald-700/60 dark:text-emerald-400/60" : "text-muted-foreground/50"
                                        )}>
                                            {habit.daysOfWeek.map(d => ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][d]).join(', ')}
                                        </span>
                                    )}
                                    
                                    {habit.streak > 0 && (
                                        <div className={cn(
                                            "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-0.5 transition-colors",
                                            completedToday ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                        )}>
                                            <Flame className="w-2.5 h-2.5" strokeWidth={3} />
                                            {habit.streak}
                                        </div>
                                    )}
                                </motion.button>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => promoteToQueue(habit.title, false)}>
                                    Promote to Active Queue
                                </ContextMenuItem>
                                <ContextMenuItem className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50" onClick={() => promoteToQueue(habit.title, true)}>
                                    Make Today's Frog
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    )
                })}
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-xl h-10 w-10 shrink-0 border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 group-hover:opacity-100 md:opacity-0 transition-opacity"
                    onClick={() => setIsManagerOpen(true)}
                >
                    <Settings2 className="w-4 h-4" />
                </Button>
            </div>

            <HabitManagerModal open={isManagerOpen} onOpenChange={setIsManagerOpen} newTitle={newHabitTitle} setNewTitle={setNewHabitTitle} onCreate={handleCreateHabit} habits={habits} onDelete={deleteHabit} />
        </div>
    );
}

function HabitManagerModal({ open, onOpenChange, newTitle, setNewTitle, onCreate, habits, onDelete }: any) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        Daily Habits
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <form onSubmit={onCreate} className="flex gap-2">
                        <Input 
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g. Drink Water, Read 10 Pages..."
                            className="flex-1"
                        />
                        <Button type="submit" disabled={!newTitle.trim()}>Add</Button>
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {habits.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-8">No habits tracked yet.</p>
                        ) : (
                            habits.map((habitCard: any) => (
                                <div key={habitCard.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{habitCard.title}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            Current Streak: <Flame className="w-3 h-3 text-orange-500" /> {habitCard.streak}
                                        </span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => onDelete(habitCard.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
