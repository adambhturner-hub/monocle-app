import { Project, RecurrenceInterval } from '@/types';
import { addDays, nextDay, startOfDay, addWeeks, addYears } from 'date-fns';

export interface ParsedTask {
    title: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: number;
    recurrence?: RecurrenceInterval;
    projectId?: string;
    duration?: number; // Minutes
    matchedTokens: string[];
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function parseTaskInput(input: string, projects: Project[] = []): ParsedTask {
    let cleanTitle = input;
    const matchedTokens: string[] = [];

    // 1. Duration Detection (Do this early to avoid confusion with dates)
    let duration: number | undefined;
    const durationPatterns = [
        { regex: /\b(\d+)\s*(m|min|mins|minutes)\b/i, multiplier: 1 },
        { regex: /\b(\d+)\s*(h|hr|hrs|hours)\b/i, multiplier: 60 }
    ];

    for (const pattern of durationPatterns) {
        if (pattern.regex.test(cleanTitle)) {
            const match = cleanTitle.match(pattern.regex);
            if (match) {
                duration = parseInt(match[1]) * pattern.multiplier;
                matchedTokens.push(match[0]);
                cleanTitle = cleanTitle.replace(pattern.regex, '');
            }
        }
    }

    // 2. Priority Detection
    let priority: 'low' | 'medium' | 'high' | undefined;

    // High
    const highPatterns = [/\b(high|urgent|asap|p1|important)\b/i, /(!{2,})/]; // !! or more
    // Med
    const medPatterns = [/\b(medium|med|normal|p2)\b/i, /(!{1})/]; // !
    // Low
    const lowPatterns = [/\b(low|lo|later|p3)\b/i];

    // Check High first (strongest wins)
    if (highPatterns.some(p => p.test(cleanTitle))) {
        priority = 'high';
        highPatterns.forEach(p => {
            const match = cleanTitle.match(p);
            if (match) {
                matchedTokens.push(match[0]);
                cleanTitle = cleanTitle.replace(p, '');
            }
        });
    } else if (medPatterns.some(p => p.test(cleanTitle))) {
        // Only match single ! if it's not part of a word (this is tricky with ! without spaces)
        // Regex /(!{1})/ matches "!" anywhere. Let's be careful.
        // Actually, let's just stick to keywords for Med/Low mostly, or strict ! count.
        // For now, if we found !, and it wasn't captured by High (!!), it matches here.
        priority = 'medium';
        medPatterns.forEach(p => {
            const match = cleanTitle.match(p);
            if (match) {
                matchedTokens.push(match[0]);
                cleanTitle = cleanTitle.replace(p, '');
            }
        });
    } else if (lowPatterns.some(p => p.test(cleanTitle))) {
        priority = 'low';
        lowPatterns.forEach(p => {
            const match = cleanTitle.match(p);
            if (match) {
                matchedTokens.push(match[0]);
                cleanTitle = cleanTitle.replace(p, '');
            }
        });
    }

    // 3. Recurrence Detection
    let recurrence: RecurrenceInterval | undefined;
    const recurrenceMap: Record<string, RecurrenceInterval> = {
        'daily': 'daily', 'every day': 'daily', 'everyday': 'daily',
        'weekly': 'weekly', 'every week': 'weekly', 'weekdays': 'daily', // Approximation
        'monthly': 'monthly', 'every month': 'monthly',
        'yearly': 'yearly', 'annually': 'yearly', 'every year': 'yearly'
    };

    // Add "every X days" support? Only if RecurrenceInterval supports it.
    // Currently RecurrenceInterval is string | number.
    // Let's check for "every N days"
    const everyNDaysRegex = /\bevery (\d+) days\b/i;
    if (everyNDaysRegex.test(cleanTitle)) {
        const match = cleanTitle.match(everyNDaysRegex);
        if (match) {
            recurrence = parseInt(match[1]);
            matchedTokens.push(match[0]);
            cleanTitle = cleanTitle.replace(everyNDaysRegex, '');
        }
    }

    if (!recurrence) {
        // Sort keys by length desc to match longer phrases first
        const recurrenceKeys = Object.keys(recurrenceMap).sort((a, b) => b.length - a.length);

        for (const key of recurrenceKeys) {
            const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i');
            if (regex.test(cleanTitle)) {
                recurrence = recurrenceMap[key];
                matchedTokens.push(key);
                cleanTitle = cleanTitle.replace(regex, '');
                break; // Take first match
            }
        }
    }

    // 4. Project Detection
    let projectId: string | undefined;

    // Explicit @/# tags
    const sortedProjects = [...projects].sort((a, b) => b.name.length - a.name.length);

    for (const project of sortedProjects) {
        const tagRegex = new RegExp(`[@#]${escapeRegExp(project.name)}\\b`, 'i');
        if (tagRegex.test(cleanTitle)) {
            projectId = project.id;
            const match = cleanTitle.match(tagRegex);
            if (match) matchedTokens.push(match[0]);
            cleanTitle = cleanTitle.replace(tagRegex, '');
            break;
        }
    }

    if (!projectId) {
        for (const project of sortedProjects) {
            const inRegex = new RegExp(`\\bin ${escapeRegExp(project.name)}\\b`, 'i');
            if (inRegex.test(cleanTitle)) {
                projectId = project.id;
                const match = cleanTitle.match(inRegex);
                if (match) matchedTokens.push(match[0]);
                cleanTitle = cleanTitle.replace(inRegex, '');
                break;
            }
        }
    }

    // 5. Due Date Detection
    let dueDate: number | undefined;
    const today = startOfDay(new Date());

    // Extended Date Patterns
    const datePatterns = [
        { regex: /\b(today|tonight|tdy)\b/i, handler: () => today },
        { regex: /\b(tomorrow|tmr|tmw)\b/i, handler: () => addDays(today, 1) },
        { regex: /\b(next week)\b/i, handler: () => addWeeks(today, 1) },
        { regex: /\b(eow|end of week)\b/i, handler: () => nextDay(today, 5) }, // Friday
        { regex: /\b(eod)\b/i, handler: () => today }, // End of Day = Today
    ];

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    // Add day matchers
    daysOfWeek.forEach((day, idx) => {
        datePatterns.push({
            regex: new RegExp(`\\b(this |next |)${day}\\b`, 'i'),
            handler: () => nextDay(today, idx as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        });
    });
    shortDays.forEach((day, idx) => {
        datePatterns.push({
            regex: new RegExp(`\\b(this |next |)${day}\\b`, 'i'),
            handler: () => nextDay(today, idx as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        });
    });

    const numericDateRegex = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
    // Month name regex: "Feb 19", "February 19th"
    const monthDateRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i;

    let dateMatched = false;

    // "in X days"
    const inDaysRegex = /\bin (\d+) days?\b/i;
    const inWeeksRegex = /\bin (\d+) weeks?\b/i;

    if (inDaysRegex.test(cleanTitle)) {
        const match = cleanTitle.match(inDaysRegex);
        if (match) {
            dueDate = addDays(today, parseInt(match[1])).getTime();
            matchedTokens.push(match[0]);
            cleanTitle = cleanTitle.replace(inDaysRegex, '');
            dateMatched = true;
        }
    } else if (inWeeksRegex.test(cleanTitle)) {
        const match = cleanTitle.match(inWeeksRegex);
        if (match) {
            dueDate = addWeeks(today, parseInt(match[1])).getTime();
            matchedTokens.push(match[0]);
            cleanTitle = cleanTitle.replace(inWeeksRegex, '');
            dateMatched = true;
        }
    }

    if (!dateMatched && monthDateRegex.test(cleanTitle)) {
        const match = cleanTitle.match(monthDateRegex);
        if (match) {
            const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const month = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m));
            const day = parseInt(match[2]);
            const currentYear = new Date().getFullYear();
            const year = match[3] ? parseInt(match[3]) : currentYear;

            let setDate = new Date(year, month, day);
            // If date has passed this year and no year, assume next
            if (!match[3] && setDate < today) {
                setDate = addYears(setDate, 1);
            }
            dueDate = setDate.getTime();
            matchedTokens.push(match[0]);
            cleanTitle = cleanTitle.replace(monthDateRegex, '');
            dateMatched = true;
        }
    }

    if (!dateMatched) {
        for (const pattern of datePatterns) {
            if (pattern.regex.test(cleanTitle)) {
                dueDate = pattern.handler().getTime();
                const match = cleanTitle.match(pattern.regex);
                if (match) matchedTokens.push(match[0]);
                cleanTitle = cleanTitle.replace(pattern.regex, '');
                dateMatched = true;
                break;
            }
        }
    }

    if (!dateMatched) {
        const match = cleanTitle.match(numericDateRegex);
        if (match) {
            const month = parseInt(match[1]) - 1;
            const day = parseInt(match[2]);
            const currentYear = new Date().getFullYear();
            let year = match[3] ? parseInt(match[3]) : currentYear;
            if (match[3] && match[3].length === 2) year += 2000;

            let setDate = new Date(year, month, day);
            if (!match[3] && setDate < today) {
                setDate = addYears(setDate, 1);
            }

            dueDate = setDate.getTime();
            matchedTokens.push(match[0]);
            cleanTitle = cleanTitle.replace(numericDateRegex, '');
            dateMatched = true;
        }
    }

    // 6. Cleanup
    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

    return {
        title: cleanTitle,
        priority,
        dueDate,
        recurrence,
        projectId,
        duration,
        matchedTokens
    };
}
