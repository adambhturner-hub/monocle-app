function getMostRecentResetDate(daysOfWeek, logicalNow) {
    const days = (!daysOfWeek || daysOfWeek.length === 0) ? [0,1,2,3,4,5,6] : daysOfWeek;
    const d = new Date(logicalNow);
    d.setHours(0, 0, 0, 0); 
    const currentDay = d.getDay();
    const sortedDays = [...days].sort((a,b) => a - b);
    let targetDay = -1;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
        if (sortedDays[i] <= currentDay) { targetDay = sortedDays[i]; break; }
    }
    if (targetDay === -1) {
        targetDay = sortedDays[sortedDays.length - 1];
        d.setDate(d.getDate() - (currentDay + 7 - targetDay));
    } else {
        d.setDate(d.getDate() - (currentDay - targetDay));
    }
    return d.getTime();
}

function getPreviousResetDate(daysOfWeek, mostRecentResetDate) {
    const days = (!daysOfWeek || daysOfWeek.length === 0) ? [0,1,2,3,4,5,6] : daysOfWeek;
    const d = new Date(mostRecentResetDate);
    const currentDay = d.getDay();
    const sortedDays = [...days].sort((a,b) => a - b);
    let previousDay = -1;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
        if (sortedDays[i] < currentDay) { previousDay = sortedDays[i]; break; }
    }
    if (previousDay === -1) {
        previousDay = sortedDays[sortedDays.length - 1]; 
        d.setDate(d.getDate() - (currentDay + 7 - previousDay));
    } else {
        d.setDate(d.getDate() - (currentDay - previousDay));
    }
    return d.getTime();
}

function getVisualStreak(streak, lastCompletedAt, daysOfWeek, logicalNow) {
    if (streak === 0 || !lastCompletedAt) return 0;
    
    // Convert lastCompletedAt to midnight logical
    const d = new Date(lastCompletedAt - (4*60*60*1000));
    d.setHours(0,0,0,0);
    const lastCompletedLogical = d.getTime();

    const mostRecentReset = getMostRecentResetDate(daysOfWeek, logicalNow);
    const completedToday = lastCompletedLogical >= mostRecentReset;

    if (completedToday) {
        return streak; 
    }

    const previousReset = getPreviousResetDate(daysOfWeek, mostRecentReset);

    // If they haven't completed it for the CURRENT period, 
    // the streak is only alive if they completed it for the PREVIOUS period.
    if (lastCompletedLogical >= previousReset) {
        return streak;
    }
    
    return 0; // Streak is broken
}

const todayStr = "2026-03-24T12:00:00Z"; // Tuesday
const today = new Date(todayStr).getTime();

// completed on Sunday 12:00 PM
const sunday = new Date("2026-03-22T12:00:00Z").getTime();
console.log("Daily, completed Sunday. Visually on Tuesday: ", getVisualStreak(10, sunday, [], today)); // should be 0

// completed on Monday 12:00 PM
const monday = new Date("2026-03-23T12:00:00Z").getTime();
console.log("Daily, completed Monday. Visually on Tuesday: ", getVisualStreak(10, monday, [], today)); // should be 10

// Weekly (Sunday), completed LAST Sunday
const lastSunday = new Date("2026-03-15T12:00:00Z").getTime();
console.log("Weekly (Sun), completed Last Sunday. Visually This Tue: ", getVisualStreak(10, lastSunday, [0], today)); // should be 10

// Weekly (Sunday), completed TWO Sundays ago
const twoSundaysAgo = new Date("2026-03-08T12:00:00Z").getTime();
console.log("Weekly (Sun), completed 2 Sundays ago. Visually This Tue: ", getVisualStreak(10, twoSundaysAgo, [0], today)); // should be 0
