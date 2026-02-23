'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Target } from "lucide-react";
import { useMonocleStore } from "@/lib/store";
import { startOfDay, subDays, isSameDay, format, isAfter } from "date-fns";

export function AnalyticsView() {
    const { sessionHistory, tasks, getCompletedTodayCount, setView } = useMonocleStore();

    // Placeholder data
    const totalCompleted = tasks.filter(t => t.status === 'done').length;
    const totalFrogs = tasks.filter(t => t.status === 'done' && t.isFrog).length;

    // 7-day Momentum Data
    const today = startOfDay(Date.now());
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));

    const completedTasks = tasks.filter(t => t.status === 'done' && t.completedAt);

    // Calculate Streaks
    const daysWithCompletion = new Set(
        tasks.filter(t => t.status === 'done' && t.completedAt)
            .map(t => format(startOfDay(t.completedAt!), "yyyy-MM-dd"))
    );
    let currentStreak = 0;
    let checkDate = startOfDay(Date.now());

    // If no tasks today, but tasks yesterday, streak is still alive from yesterday
    if (!daysWithCompletion.has(format(checkDate, "yyyy-MM-dd"))) {
        if (daysWithCompletion.has(format(subDays(checkDate, 1), "yyyy-MM-dd"))) {
            checkDate = subDays(checkDate, 1);
        }
    }

    while (daysWithCompletion.has(format(checkDate, "yyyy-MM-dd"))) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
    }

    // Calculate Focus Time
    const totalFocusMinutes = Math.floor(
        sessionHistory.reduce((acc, session) => {
            if (session.endTime && session.startTime) {
                return acc + (session.endTime - session.startTime - (session.totalPausedMs || 0));
            }
            return acc;
        }, 0) / 1000 / 60
    );

    // Calculate Recent Sessions
    const sevenDaysAgo = subDays(Date.now(), 7).getTime();
    const sessionsThisWeek = sessionHistory.filter(s => s.endTime && s.endTime > sevenDaysAgo).length;

    const chartData = last7Days.map(day => {
        const count = completedTasks.filter(t => t.completedAt && isSameDay(t.completedAt, day)).length;
        return {
            date: day,
            label: format(day, 'EEE'), // Mon, Tue, etc.
            count
        };
    });

    const maxCount = Math.max(...chartData.map(d => d.count), 5); // Minimum scale of 5

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Insights</h2>
                    <p className="text-muted-foreground">Your execution history and momentum.</p>
                </div>
                <button
                    onClick={() => setView('queue')}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Queue
                </button>
            </div>

            {totalCompleted === 0 && sessionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-secondary/10 mt-8">
                    <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground/80 mb-2">No data yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Your execution history is clean. Complete tasks to begin building momentum.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Focus Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalFocusMinutes}m</div>
                                <p className="text-xs text-muted-foreground">All time deep work</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">🔥 Current Streak</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{currentStreak}</div>
                                <p className="text-xs text-muted-foreground">Days active</p>
                            </CardContent>
                        </Card>
                        <Card className="col-span-2 lg:col-span-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{sessionsThisWeek}</div>
                                <p className="text-xs text-muted-foreground">Focus sessions this week</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lifetime Completed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalCompleted}</div>
                                <p className="text-xs text-muted-foreground">Tasks executed</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">🐸 Frogs Eaten</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalFrogs}</div>
                                <p className="text-xs text-muted-foreground">Apex targets eliminated</p>
                            </CardContent>
                        </Card>
                        <Card className="col-span-2 lg:col-span-1">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{getCompletedTodayCount()}</div>
                                <p className="text-xs text-muted-foreground">Tasks</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 7-Day Momentum Chart */}
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle>Momentum (Last 7 Days)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="w-full h-[280px] flex items-end justify-between gap-2 md:gap-6 px-2 md:px-8 border-b pb-4">
                                {chartData.map((data, i) => {
                                    const heightPercent = (data.count / maxCount) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                            <div className="w-full h-[220px] flex items-end justify-center relative group">
                                                <div
                                                    className="w-full max-w-[40px] bg-primary/20 hover:bg-primary/40 rounded-t-md transition-all duration-500 flex items-end justify-center relative"
                                                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-8 bg-foreground text-background text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                        {data.count} task{data.count !== 1 && 's'}
                                                    </div>
                                                    {/* Inner Fill */}
                                                    <div
                                                        className="w-full bg-primary rounded-t-md transition-all duration-1000"
                                                        style={{ height: '100%' }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-muted-foreground">{data.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
