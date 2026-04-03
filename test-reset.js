function getMostRecentResetDate(daysOfWeek, logicalNow) {
    if (!daysOfWeek || daysOfWeek.length === 0) daysOfWeek = [0,1,2,3,4,5,6];
    
    const d = new Date(logicalNow);
    d.setHours(0, 0, 0, 0); 
    const currentDay = d.getDay();
    
    const sortedDays = [...daysOfWeek].sort((a,b) => a - b);
    
    let targetDay = -1;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
        if (sortedDays[i] <= currentDay) {
            targetDay = sortedDays[i];
            break;
        }
    }
    
    if (targetDay === -1) {
        targetDay = sortedDays[sortedDays.length - 1];
        const daysToSubtract = currentDay + 7 - targetDay;
        d.setDate(d.getDate() - daysToSubtract);
    } else {
        const daysToSubtract = currentDay - targetDay;
        d.setDate(d.getDate() - daysToSubtract);
    }
    return d.getTime();
}

function getPreviousResetDate(daysOfWeek, mostRecentResetDate) {
    if (!daysOfWeek || daysOfWeek.length === 0) daysOfWeek = [0,1,2,3,4,5,6];

    const d = new Date(mostRecentResetDate);
    const currentDay = d.getDay();
    const sortedDays = [...daysOfWeek].sort((a,b) => a - b);
    
    let previousDay = -1;
    for (let i = sortedDays.length - 1; i >= 0; i--) {
        if (sortedDays[i] < currentDay) { 
            previousDay = sortedDays[i];
            break;
        }
    }
    
    if (previousDay === -1) {
        previousDay = sortedDays[sortedDays.length - 1]; 
        const daysToSubtract = currentDay + 7 - previousDay;
        d.setDate(d.getDate() - daysToSubtract);
    } else {
        const daysToSubtract = currentDay - previousDay;
        d.setDate(d.getDate() - daysToSubtract);
    }
    return d.getTime();
}

const todayStr = "2026-03-24T12:00:00Z"; // Tuesday
const today = new Date(todayStr).getTime();

console.log("=== TUESDAY ===");
console.log("Daily target:", new Date(getMostRecentResetDate([], today)).toDateString());
console.log("Daily prev:", new Date(getPreviousResetDate([], getMostRecentResetDate([], today))).toDateString());

console.log("\nSunday target:", new Date(getMostRecentResetDate([0], today)).toDateString());
console.log("Sunday prev:", new Date(getPreviousResetDate([0], getMostRecentResetDate([0], today))).toDateString());

console.log("\nM,W,F target:", new Date(getMostRecentResetDate([1,3,5], today)).toDateString());
console.log("M,W,F prev:", new Date(getPreviousResetDate([1,3,5], getMostRecentResetDate([1,3,5], today))).toDateString());

console.log("\nIf today is MONDAY:");
const mon = new Date("2026-03-23T12:00:00Z").getTime();
console.log("M,W,F target:", new Date(getMostRecentResetDate([1,3,5], mon)).toDateString());
console.log("M,W,F prev:", new Date(getPreviousResetDate([1,3,5], getMostRecentResetDate([1,3,5], mon))).toDateString());
