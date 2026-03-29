import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getMostRecentResetDate(daysOfWeek: number[] | undefined, logicalNow: number): number {
    const days = (!daysOfWeek || daysOfWeek.length === 0) ? [0,1,2,3,4,5,6] : daysOfWeek;
    
    const d = new Date(logicalNow);
    d.setHours(0, 0, 0, 0); 
    const currentDay = d.getDay();
    
    const sortedDays = [...days].sort((a,b) => a - b);
    
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

export function getPreviousResetDate(daysOfWeek: number[] | undefined, mostRecentResetDate: number): number {
    const days = (!daysOfWeek || daysOfWeek.length === 0) ? [0,1,2,3,4,5,6] : daysOfWeek;

    const d = new Date(mostRecentResetDate);
    const currentDay = d.getDay();
    const sortedDays = [...days].sort((a,b) => a - b);
    
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

export function getNextResetDate(daysOfWeek: number[] | undefined, mostRecentResetDate: number): number {
    const days = (!daysOfWeek || daysOfWeek.length === 0) ? [0,1,2,3,4,5,6] : daysOfWeek;

    const d = new Date(mostRecentResetDate);
    const currentDay = d.getDay();
    const sortedDays = [...days].sort((a,b) => a - b);
    
    let nextDay = -1;
    for (let i = 0; i < sortedDays.length; i++) {
        if (sortedDays[i] > currentDay) { 
            nextDay = sortedDays[i];
            break;
        }
    }
    
    if (nextDay === -1) {
        nextDay = sortedDays[0]; 
        const daysToAdd = 7 - currentDay + nextDay;
        d.setDate(d.getDate() + daysToAdd);
    } else {
        const daysToAdd = nextDay - currentDay;
        d.setDate(d.getDate() + daysToAdd);
    }
    return d.getTime();
}
