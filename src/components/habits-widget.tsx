import React, { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Flame, Plus, Settings2, Trash2, Check, CheckCircle2, Edit2 } from 'lucide-react';
import { isToday, startOfDay, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateId } from '@/lib/utils';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

import { parseTaskInput } from '@/lib/smart-parser';

export function HabitsWidget() {
    const { habits, toggleHabit, addHabit, deleteHabit, addTask } = useMonocleStore();
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState('');

    const handleCreateHabit = (e: React.FormEvent) => {
        e.preventDefault();
        const rawTitle = newHabitTitle.trim();
        if (!rawTitle) return;

        // Append explicit tag so the parser detects it as a habit and extracts daysOfWeek
        const parsedData = parseTaskInput(rawTitle + ' !habit');
        // The parser automatically removes the tag from parsedData.title
        const finalTitle = parsedData.title || rawTitle;

        addHabit({
            id: generateId(),
            title: finalTitle,
            daysOfWeek: parsedData.daysOfWeek,
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

                    const isScheduled = habit.daysOfWeek && habit.daysOfWeek.length > 0 && habit.daysOfWeek.length < 7;

                    return (
                        <ContextMenu key={habit.id}>
                            <ContextMenuTrigger asChild>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleToggle(habit.id, habit.streak, completedToday)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all snap-start shrink-0 select-none cursor-pointer border",
                                        completedToday 
                                            ? isScheduled 
                                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400 shadow-sm"
                                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                            : "bg-transparent border-transparent text-muted-foreground opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-3.5 h-3.5 rounded-full border transition-colors shrink-0",
                                        completedToday 
                                            ? isScheduled ? "bg-indigo-500 border-indigo-500" : "bg-emerald-500 border-emerald-500" 
                                            : "border-muted-foreground/40 bg-transparent"
                                    )}>
                                        {completedToday && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    
                                    <span className={cn(
                                        "text-[13px] whitespace-nowrap",
                                        completedToday ? "font-bold" : "font-medium"
                                    )}>
                                        {habit.title}
                                    </span>

                                    {isScheduled && (
                                        <span className={cn(
                                            "text-[10px] ml-0.5 tracking-tighter uppercase font-bold",
                                            completedToday 
                                                ? isScheduled ? "text-indigo-700/60 dark:text-indigo-400/60" : "text-emerald-700/60 dark:text-emerald-400/60"
                                                : "text-muted-foreground/50"
                                        )}>
                                            {habit.daysOfWeek!.map(d => ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][d]).join(', ')}
                                        </span>
                                    )}
                                    
                                    {habit.streak > 0 && (
                                        <div className={cn(
                                            "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-0.5 transition-colors",
                                            completedToday 
                                                ? isScheduled ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                                                : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const handleSaveEdit = (e: React.FormEvent, id: string) => {
        e.preventDefault();
        const rawTitle = editTitle;
        if (!rawTitle.trim()) return;

        // Append explicit tag so the parser detects it as a habit and extracts daysOfWeek
        const parsedData = parseTaskInput(rawTitle + ' !habit');
        const finalTitle = parsedData.title || rawTitle;

        useMonocleStore.getState().updateHabit(id, {
            title: finalTitle,
            daysOfWeek: parsedData.daysOfWeek,
        });
        setEditingId(null);
    };

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

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 pb-2">
                        {habits.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-8">No habits tracked yet.</p>
                        ) : (() => {
                            const dailyHabits = habits.filter((h: any) => !h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.length === 7);
                            const weeklyHabits = habits.filter((h: any) => h.daysOfWeek && h.daysOfWeek.length > 0 && h.daysOfWeek.length < 7);

                            const renderHabitRow = (habitCard: any) => (
                                <div key={habitCard.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    {editingId === habitCard.id ? (
                                        <form className="flex-1 flex items-center gap-2" onSubmit={(e) => handleSaveEdit(e, habitCard.id)}>
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                autoFocus
                                                className="h-8 text-sm"
                                            />
                                            <Button type="submit" size="sm" className="h-8 shrink-0">Save</Button>
                                            <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={() => setEditingId(null)}>Cancel</Button>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <span className="font-medium text-sm truncate">{habitCard.title}</span>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Flame className="w-3 h-3 text-orange-500 shrink-0" /> {habitCard.streak}
                                                    </span>
                                                    {habitCard.daysOfWeek && habitCard.daysOfWeek.length > 0 && habitCard.daysOfWeek.length < 7 && (
                                                        <span className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-wider">
                                                            {habitCard.daysOfWeek.map((d: number) => ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][d]).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        const existingDays = habitCard.daysOfWeek 
                                                            ? habitCard.daysOfWeek.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(' ') 
                                                            : '';
                                                        setEditTitle(habitCard.title + (existingDays ? ` ${existingDays}` : ''));
                                                        setEditingId(habitCard.id);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => onDelete(habitCard.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );

                            return (
                                <>
                                    {dailyHabits.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">Daily</span>
                                                <div className="h-px bg-border flex-1"></div>
                                            </div>
                                            {dailyHabits.map(renderHabitRow)}
                                        </div>
                                    )}
                                    {weeklyHabits.length > 0 && (
                                        <div className="space-y-2 mt-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest pl-1">Weekly</span>
                                                <div className="h-px bg-border flex-1"></div>
                                            </div>
                                            {weeklyHabits.map(renderHabitRow)}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
