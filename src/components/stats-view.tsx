'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useStats } from '@/hooks/use-stats';
import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Activity, Clock, Trophy, BarChart3, TrendingUp, PieChart, CheckCircle2 } from 'lucide-react';
import { getIconComponent } from '@/lib/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

export function StatsView() {
    const { activeSheet, setOpenSheet } = useMonocleStore();
    const stats = useStats();

    return (
        <Sheet open={activeSheet === 'stats'} onOpenChange={(val) => setOpenSheet(val ? 'stats' : null)}>
            <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto sm:px-8">
                <SheetHeader className="mb-8 mt-4">
                    <SheetTitle className="flex items-center gap-3 text-2xl font-bold">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        Productivity Insights
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-8 pb-12">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Focus Time
                            </span>
                            <div className="text-2xl font-mono font-bold text-foreground">
                                {stats.totalFocusHours}<span className="text-sm font-normal text-muted-foreground ml-1">hrs</span>
                            </div>
                        </div>
                        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Tasks Done
                            </span>
                            <div className="text-2xl font-mono font-bold text-foreground">
                                {stats.totalCompletedTasks}
                            </div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                🐸 Frogs Eaten
                            </span>
                            <div className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                {stats.totalFrogsEaten}
                            </div>
                        </div>
                        <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Trophy className="h-3 w-3 text-yellow-500" /> Frog Streak
                            </span>
                            <div className="text-2xl font-mono font-bold text-foreground">
                                {stats.frogStreak}<span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                            </div>
                        </div>
                    </div>

                    {/* Productivity Heatmap */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Productivity Heatmap
                        </h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.productivityHeatmap} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                                        labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="count" name="Tasks" stroke="var(--chart-3)" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Activity */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Daily Activity (Last 7 Days)
                        </h3>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.dailyActivity} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--chart-2)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RechartsTooltip
                                        cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                                        contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                                    />
                                    <Bar yAxisId="left" dataKey="minutes" name="Focus (min)" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="tasksCompleted" name="Tasks" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
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
                                            <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: project.color }}>
                                                {(() => {
                                                    const IconCmp = getIconComponent(project.icon);
                                                    return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                                })()}
                                            </div>
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

                    {/* Completion Breakdown (Outcomes) */}
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
