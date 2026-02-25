'use client';

import { useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { Skull, CheckCircle2 } from 'lucide-react';

export function FrogGraveyard() {
    const tasks = useMonocleStore(state => state.tasks);

    // Calculate last 28 days of frog history
    const history = useMemo(() => {
        const days = [];
        const today = startOfDay(Date.now());

        let totalAvoided = 0;
        let totalEaten = 0;

        for (let i = 27; i >= 0; i--) {
            const date = subDays(today, i);

            // Find frogs eaten on this day
            const eatenFrogs = tasks.filter(t =>
                t.status === 'done' &&
                t.completedAt &&
                isSameDay(new Date(t.completedAt), date) &&
                (t.isFrog || (t.isAvoidedFrog && t.completedAt > (t.avoidedAt || 0)))
                // If an avoided frog is later eaten, it counts as eaten for the completion day
            );

            // Find frogs avoided on this day
            const avoidedFrogs = tasks.filter(t =>
                t.isAvoidedFrog &&
                t.avoidedAt &&
                isSameDay(new Date(t.avoidedAt), date)
            );

            const eaten = eatenFrogs.length;
            const avoided = avoidedFrogs.length;

            totalEaten += eaten;
            totalAvoided += avoided;

            let status: 'empty' | 'eaten' | 'avoided' | 'mixed' = 'empty';
            if (eaten > 0 && avoided > 0) status = 'mixed';
            else if (eaten > 0) status = 'eaten';
            else if (avoided > 0) status = 'avoided';

            days.push({
                date,
                status,
                eaten,
                avoided
            });
        }

        return { days, totalEaten, totalAvoided };
    }, [tasks]);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                    <Skull className="h-4 w-4" />
                    The Frog Graveyard
                </span>
                <span className="text-xs font-mono font-normal">
                    <span className="text-emerald-500">{history.totalEaten} Killed</span>
                    <span className="mx-2 opacity-50">/</span>
                    <span className="text-red-500">{history.totalAvoided} Avoided</span>
                </span>
            </h3>

            <div className="bg-card border rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap gap-1.5 justify-start">
                    {history.days.map((day, i) => {
                        const isToday = i === history.days.length - 1;
                        return (
                            <div
                                key={i}
                                title={`${format(day.date, 'MMM d')}: ${day.eaten} Eaten, ${day.avoided} Avoided`}
                                className={cn(
                                    "w-6 h-6 rounded-md transition-all hover:scale-110 cursor-help ring-1 ring-inset",
                                    day.status === 'empty' ? "bg-muted/30 ring-border/50" : "",
                                    day.status === 'eaten' ? "bg-emerald-500/20 ring-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "",
                                    day.status === 'avoided' ? "bg-red-500/20 ring-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]" : "",
                                    day.status === 'mixed' ? "bg-gradient-to-br from-emerald-500/40 to-red-500/40 ring-border/50" : "",
                                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                )}
                            />
                        );
                    })}
                </div>
                <div className="flex items-center justify-between mt-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <span>28 Days Ago</span>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500/40 ring-1 ring-red-500/50" /> Avoided</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500/40 ring-1 ring-emerald-500/50" /> Killed</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
