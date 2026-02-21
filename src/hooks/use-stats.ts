
import { useMonocleStore } from '@/lib/store';
import { useMemo } from 'react';
import { isSameDay, subDays, format, startOfDay } from 'date-fns';
import { FocusSession } from '@/types';

const getSessionDurationSeconds = (session: FocusSession) => {
    const end = session.endTime || Date.now();
    const rawMs = end - session.startTime;
    const actualMs = Math.max(0, rawMs - (session.totalPausedMs || 0));
    return Math.floor(actualMs / 1000);
};

export function useStats() {
    const { sessionHistory } = useMonocleStore();

    const stats = useMemo(() => {
        // 1. Total Focus Time
        const totalFocusSeconds = sessionHistory.reduce((acc, session) => acc + getSessionDurationSeconds(session), 0);
        const totalFocusMinutes = Math.floor(totalFocusSeconds / 60);
        const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

        // 2. Daily Activity (Last 7 days)
        const dailyActivity = Array.from({ length: 7 }).map((_, i) => {
            const date = subDays(new Date(), 6 - i); // Chronological order: 6 days ago -> Today
            const dayStart = startOfDay(date);

            const sessions = sessionHistory.filter(s => isSameDay(new Date(s.startTime), date));
            const focusSeconds = sessions.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0);
            const focusMinutes = Math.floor(focusSeconds / 60);

            return {
                date: format(date, 'EEE'), // Mon, Tue...
                fullDate: format(date, 'MMM d'),
                minutes: focusMinutes,
                isToday: isSameDay(date, new Date())
            };
        });

        // 3. Outcomes Breakdown
        const outcomes = sessionHistory.reduce((acc, session) => {
            const outcome = session.outcome || 'unknown';
            acc[outcome] = (acc[outcome] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // 4. Current Streak (Consecutive days with > 0 minutes)
        // We iterate backwards from Today.
        let streak = 0;
        let checkDate = new Date();

        while (true) {
            const sessionsThisDay = sessionHistory.filter(s => isSameDay(new Date(s.startTime), checkDate));
            const focusThisDay = sessionsThisDay.reduce((acc, s) => acc + getSessionDurationSeconds(s), 0);

            if (focusThisDay > 0) {
                streak++;
                checkDate = subDays(checkDate, 1);
            } else {
                // If today has 0, streak is 0? Or do we check yesterday if today is just started?
                // Standard logic: if today has 0, check yesterday. 
                // If today has 0 AND it's the first check, maybe we shouldn't break immediately if we want to preserve streak from yesterday?
                // But "Current Streak" usually implies active streak. 
                // Let's stick to simple: consecutive non-zero days ending today or yesterday.

                if (isSameDay(checkDate, new Date()) && streak === 0) {
                    // If we are checking today and it's 0, we check yesterday.
                    checkDate = subDays(checkDate, 1);
                    continue;
                }
                break;
            }
        }

        // 5. Project Breakdown
        const { projects } = useMonocleStore.getState();
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
                    color: project?.color || '#808080', // Default gray
                    icon: project?.icon,
                    durationSeconds,
                    durationHours: (durationSeconds / 3600).toFixed(1),
                    percentage: Math.round((durationSeconds / totalFocusSeconds) * 100) || 0
                };
            })
            .sort((a, b) => b.durationSeconds - a.durationSeconds); // Sort by most focused

        return {
            totalFocusMinutes,
            totalFocusHours,
            dailyActivity,
            outcomes,
            streak,
            totalSessions: sessionHistory.length,
            projectBreakdown
        };

    }, [sessionHistory]);

    return stats;
}
