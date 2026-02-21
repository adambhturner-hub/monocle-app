
import { useMonocleStore } from '@/lib/store';
import { useMemo } from 'react';
import { isSameDay, subDays, format, startOfDay, getHours } from 'date-fns';
import { FocusSession } from '@/types';

const getSessionDurationSeconds = (session: FocusSession) => {
    const end = session.endTime || Date.now();
    const rawMs = end - session.startTime;
    const actualMs = Math.max(0, rawMs - (session.totalPausedMs || 0));
    return Math.floor(actualMs / 1000);
};

export function useStats() {
    const { sessionHistory, tasks, projects } = useMonocleStore();

    const stats = useMemo(() => {
        // 1. Total Focus Time
        const totalFocusSeconds = sessionHistory.reduce((acc, session) => acc + getSessionDurationSeconds(session), 0);
        const totalFocusMinutes = Math.floor(totalFocusSeconds / 60);
        const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

        // Task Aggregation
        const completedTasksAll = tasks.filter(t => t.status === 'done' || t.completedAt);
        const frogTasks = completedTasksAll.filter(t => t.isFrog);
        const totalFrogsEaten = frogTasks.length;

        // 2. Daily Activity (Last 7 days)
        const dailyActivity = Array.from({ length: 7 }).map((_, i) => {
            const date = subDays(new Date(), 6 - i); // Chronological order: 6 days ago -> Today

            const sessions = sessionHistory.filter(s => isSameDay(new Date(s.startTime), date));
            const focusSeconds = sessions.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0);
            const focusMinutes = Math.floor(focusSeconds / 60);

            const completedToday = completedTasksAll.filter(t => t.completedAt && isSameDay(new Date(t.completedAt), date));
            const frogsToday = completedToday.filter(t => t.isFrog).length;

            return {
                date: format(date, 'EEE'), // Mon, Tue...
                fullDate: format(date, 'MMM d'),
                minutes: focusMinutes,
                tasksCompleted: completedToday.length,
                frogsEaten: frogsToday,
                isToday: isSameDay(date, new Date())
            };
        });

        // 3. Outcomes Breakdown
        const outcomes = sessionHistory.reduce((acc, session) => {
            const outcome = session.outcome || 'unknown';
            acc[outcome] = (acc[outcome] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // 4. Current Streaks
        let streak = 0;
        let checkDate = new Date();
        while (true) {
            const sessionsThisDay = sessionHistory.filter(s => isSameDay(new Date(s.startTime), checkDate));
            const focusThisDay = sessionsThisDay.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0);
            if (focusThisDay > 0) {
                streak++;
                checkDate = subDays(checkDate, 1);
            } else {
                if (isSameDay(checkDate, new Date()) && streak === 0) {
                    checkDate = subDays(checkDate, 1);
                    continue;
                }
                break;
            }
        }

        let frogStreak = 0;
        let frogCheckDate = new Date();
        while (true) {
            const frogsOnDay = frogTasks.filter(t => t.completedAt && isSameDay(new Date(t.completedAt), frogCheckDate)).length;
            if (frogsOnDay > 0) {
                frogStreak++;
                frogCheckDate = subDays(frogCheckDate, 1);
            } else {
                if (isSameDay(frogCheckDate, new Date()) && frogStreak === 0) {
                    frogCheckDate = subDays(frogCheckDate, 1);
                    continue;
                }
                break;
            }
        }

        // 5. Project Breakdown
        const projectStats = sessionHistory.reduce((acc, session) => {
            if (!session.projectId) return acc;
            acc[session.projectId] = (acc[session.projectId] || 0) + getSessionDurationSeconds(session);
            return acc;
        }, {} as Record<string, number>);

        const projectBreakdown = Object.entries(projectStats)
            .map(([projectId, durationSeconds]) => {
                const project = projects.find(p => p.id === projectId);
                return {
                    id: projectId,
                    name: project?.name || 'Unknown Project',
                    color: project?.color || '#808080',
                    icon: project?.icon,
                    durationSeconds,
                    durationHours: (durationSeconds / 3600).toFixed(1),
                    percentage: totalFocusSeconds ? Math.round((durationSeconds / totalFocusSeconds) * 100) : 0
                };
            })
            .sort((a, b) => b.durationSeconds - a.durationSeconds);

        // 6. Productivity Heatmap
        const hourlyData = Array.from({ length: 24 }).fill(0) as number[];
        completedTasksAll.forEach(t => {
            if (t.completedAt) {
                const hour = getHours(new Date(t.completedAt));
                hourlyData[hour]++;
            }
        });
        const productivityHeatmap = hourlyData.map((count, hour) => {
            const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
            return { hour, label, count };
        });

        return {
            totalFocusMinutes,
            totalFocusHours,
            dailyActivity,
            outcomes,
            streak,
            totalSessions: sessionHistory.length,
            projectBreakdown,
            totalCompletedTasks: completedTasksAll.length,
            totalFrogsEaten,
            frogStreak,
            productivityHeatmap
        };

    }, [sessionHistory, tasks, projects]);

    return stats;
}
