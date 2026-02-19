
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useStats } from '@/hooks/use-stats';
import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Activity, Clock, Trophy, BarChart3, TrendingUp, PieChart } from 'lucide-react';

export function StatsView() {
    const { activeSheet, setOpenSheet } = useMonocleStore();
    const stats = useStats(); // Use local hook logic inside component? Or separate? 
    // Wait, I created useStats logic inside the component file in my thought process, 
    // but the file created was `src/hooks/use-stats.ts`. 
    // So import works.

    // Calculate max minutes for chart scaling
    const maxMinutes = Math.max(...stats.dailyActivity.map(d => d.minutes), 60); // Minimum scale 60m

    return (
        <Sheet open={activeSheet === 'stats'} onOpenChange={(val) => setOpenSheet(val ? 'stats' : null)}>
            <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto sm:px-8">
                <SheetHeader className="mb-8 mt-4">
                    <SheetTitle className="flex items-center gap-3 text-2xl font-bold">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        Productivity Insights
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Total Focus
                            </span>
                            <div className="text-2xl font-mono font-bold text-foreground">
                                {stats.totalFocusHours}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                            </div>
                        </div>
                        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> Current Streak
                            </span>
                            <div className="text-2xl font-mono font-bold text-foreground">
                                {stats.streak}<span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                            </div>
                        </div>
                    </div>

                    {/* Project Breakdown */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-primary" />
                            Focus Distribution
                        </h3>
                        <div className="space-y-3">
                            {stats.projectBreakdown.map(project => (
                                <div key={project.id} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                                            {project.name}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {project.durationHours} hrs ({project.percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${project.percentage}%`,
                                                backgroundColor: project.color
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {stats.projectBreakdown.length === 0 && (
                                <div className="text-center py-6 text-muted-foreground text-sm italic">
                                    No project data yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Activity Chart */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Daily Activity (Last 7 Days)
                        </h3>
                        <div className="h-64 flex items-end justify-between gap-4 p-6 bg-muted/20 border rounded-xl relative">
                            {/* Y-Axis Grid Lines (Optional, maybe skip for simplicity) */}

                            {stats.dailyActivity.map((day, i) => {
                                const heightPercentage = (day.minutes / maxMinutes) * 100;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                        <div className="w-full relative flex-1 flex items-end justify-center">
                                            <div
                                                className={cn(
                                                    "w-full max-w-[24px] rounded-t-sm transition-all duration-500 ease-out group-hover:opacity-80 active:scale-95",
                                                    day.isToday ? "bg-primary" : "bg-primary/40",
                                                    day.minutes === 0 && "h-[2px] bg-muted-foreground/20"
                                                )}
                                                style={{ height: `${Math.max(day.minutes === 0 ? 0 : 5, heightPercentage)}%` }} // Min visual height 5% unless 0
                                            >
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border">
                                                    {day.minutes}m
                                                </div>
                                            </div>
                                        </div>
                                        <span className={cn("text-[10px] font-mono uppercase", day.isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                                            {day.date}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Completion Breakdown (Outcomes) - Simple List or Badges */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Session Outcomes
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {(['complete_task', 'skip_task', 'abandoned'] as const).map(outcome => (
                                <div key={outcome} className="bg-muted/30 border rounded-lg p-3 flex flex-col items-center text-center gap-1">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        {outcome.replace('_task', '')}
                                    </span>
                                    <span className="text-xl font-mono font-bold">
                                        {stats.outcomes[outcome] || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
