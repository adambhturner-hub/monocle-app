import { Task, FocusSession } from '@/types';
import { getHours, isSameDay, subDays } from 'date-fns';

export function generateWeeklyInsight(tasks: Task[], sessions: FocusSession[]): string | null {
    if (sessions.length < 5) {
        return "Keep focusing to unlock personalized insights.";
    }

    // Heuristics
    // 1. Peak Focus Hour
    // 2. Avoided Frogs
    // 3. Best Project

    const completedTasks = tasks.filter(t => t.status === 'done' || t.completedAt);

    // Check for Avoided Frogs
    const avoidedFrogs = tasks.filter(t => t.isFrog && t.isAvoidedFrog);
    // Actually, we don't have isAvoidedFrog field. Let's look at frogs created later in the day that were skipped or not done
    // Or just look at frogs that have high friction (holds/skips)
    const highFrictionFrogs = completedTasks.filter(t => t.isFrog && (t.friction?.skips || 0) + (t.friction?.holds || 0) > 2);

    if (highFrictionFrogs.length > 2) {
        return "You tend to hesitate on Frogs. Try breaking them into smaller Lightning tasks first.";
    }

    // Calculate Peak Focus Time (which hour has the most completed tasks or most session time)
    const hourlyFocus = Array.from({ length: 24 }).fill(0) as number[];
    let maxHour = -1;
    let maxCount = -1;

    sessions.forEach(s => {
        const hour = getHours(new Date(s.startTime));
        hourlyFocus[hour]++;
        if (hourlyFocus[hour] > maxCount) {
            maxCount = hourlyFocus[hour];
            maxHour = hour;
        }
    });

    if (maxHour !== -1 && maxCount > 3) {
        const ampm = maxHour >= 12 ? 'PM' : 'AM';
        const displayHour = maxHour === 0 ? 12 : maxHour > 12 ? maxHour - 12 : maxHour;

        // Find a window
        const nextHour = (maxHour + 1) % 24;
        const nextAmPm = nextHour >= 12 ? 'PM' : 'AM';
        const displayNextHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour;

        return `You focus best between ${displayHour}${ampm} and ${displayNextHour}${nextAmPm}. Guard this time.`;
    }

    // Streak Check
    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const sessionsThisDay = sessions.filter(s => isSameDay(new Date(s.startTime), checkDate));
        if (sessionsThisDay.length > 0) {
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

    if (streak >= 3) {
        return `You're on a ${streak}-day focus streak. Momentum is building.`;
    }

    // Default insight
    return "You're consistently capturing tasks. Now focus on deep execution.";
}
