import React, { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Flame, Plus, Settings2, Trash2, Check, CheckCircle2 } from 'lucide-react';
import { isToday } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateId } from '@/lib/utils';

export function HabitsWidget() {
    const { habits, toggleHabit, addHabit, deleteHabit } = useMonocleStore();
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

    return (
        <div className="w-full mb-6 relative group">
            <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x">
                {habits.map(habit => {
                    const completedToday = habit.lastCompletedAt ? isToday(habit.lastCompletedAt) : false;
                    return (
                        <button
                            key={habit.id}
                            onClick={() => toggleHabit(habit.id)}
                            className={cn(
                                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all snap-start shrink-0 select-none",
                                completedToday 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-sm" 
                                    : "bg-card border-border hover:bg-muted text-foreground hover:border-muted-foreground/30",
                                !completedToday && "active:scale-95"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-5 h-5 rounded-full border transition-colors shrink-0",
                                completedToday ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30 bg-transparent"
                            )}>
                                {completedToday && <Check className="w-3 h-3 text-white" />}
                            </div>
                            
                            <span className={cn(
                                "text-sm whitespace-nowrap",
                                completedToday ? "font-bold" : "font-medium"
                            )}>
                                {habit.title}
                            </span>
                            
                            {habit.streak > 0 && (
                                <div className={cn(
                                    "flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1 transition-colors",
                                    completedToday ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                )}>
                                    <Flame className="w-3 h-3" strokeWidth={3} />
                                    {habit.streak}
                                </div>
                            )}
                        </button>
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
