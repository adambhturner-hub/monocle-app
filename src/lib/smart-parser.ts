import { Project, RecurrenceInterval } from '@/types';
import { addDays, nextDay, startOfDay, addWeeks, addMonths, addYears } from 'date-fns';

export interface ParsedToken {
    text: string;
    type: 'frog' | 'lightning' | 'duration' | 'priority' | 'recurrence' | 'project' | 'date' | 'waiting' | 'idea';
    color?: string;
}

export interface ParsedTask {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    launchDate?: number;
    recurrence?: RecurrenceInterval;
    projectId?: string;
    duration?: number; // Minutes
    isFrog?: boolean;
    isLightning?: boolean;
    isWaiting?: boolean;
    isIdea?: boolean;
    matchedTokens: ParsedToken[];
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function parseTaskInput(input: string, projects: Project[] = []): ParsedTask {
    let cleanTitle = input;
    const matchedTokens: ParsedToken[] = [];

    let isFrog = false;
    let isLightning = false;
    let isWaiting = false;

    // 0. Special Flags (Frog/Lightning/Waiting)
    // Use (?:^|\s) to catch tags at start of string or after a space, since \b doesn't trigger on @ or !
    const frogRegex = /(?:^|\s)(frog|@frog|!frog)(?=\s|$)/i;
    const lightningRegex = /(?:^|\s)(lightning|@lightning|!lightning|bolt|quick|fast)(?=\s|$)/i;

    if (frogRegex.test(cleanTitle)) {
        const match = cleanTitle.match(frogRegex);
        if (match && match[1]) {
            isFrog = true;
            matchedTokens.push({ text: match[1], type: 'frog' }); // push just the token
            cleanTitle = cleanTitle.replace(match[0], ' ').trim(); // replace the matched block (including leading space) with a single space to avoid smushing words
        }
    }

    if (lightningRegex.test(cleanTitle)) {
        const match = cleanTitle.match(lightningRegex);
        if (match && match[1]) {
            isLightning = true;
            matchedTokens.push({ text: match[1], type: 'lightning' });
            cleanTitle = cleanTitle.replace(match[0], ' ').trim();
        }
    }

    let isIdea = false;
    const ideaRegex = /(?:^|\s)(idea|@idea|!idea|dump|@dump|!dump|brainstorm)(?=\s|$)/i;
    if (ideaRegex.test(cleanTitle)) {
        const match = cleanTitle.match(ideaRegex);
        if (match && match[1]) {
            isIdea = true;
            matchedTokens.push({ text: match[1], type: 'idea' });
            cleanTitle = cleanTitle.replace(match[0], ' ').trim();
        }
    }

    const waitRegex = /(?:^|\s)(wait|@wait|!wait|waiting|@waiting|!waiting)(?=\s|$)/i;
    if (waitRegex.test(cleanTitle)) {
        const match = cleanTitle.match(waitRegex);
        if (match && match[1]) {
            isWaiting = true;
            matchedTokens.push({ text: match[1], type: 'waiting' });
            cleanTitle = cleanTitle.replace(match[0], ' ').trim();
        }
    }

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
                matchedTokens.push({ text: match[0], type: 'duration' });
                cleanTitle = cleanTitle.replace(pattern.regex, '');
            }
        }
    }

    // 2. Priority Detection
    let priority: 'low' | 'medium' | 'high' | undefined;

    // High
    const highPatterns = [/\b(high|urgent|asap|p1|important)\b/i, /(!{3,})/]; // !!! or more
    // Med
    const medPatterns = [/\b(medium|med|normal|p2)\b/i, /(?<=^|\s)(!!)(?=\s|$)/]; // exactly !!
    // Low
    const lowPatterns = [/\b(low|lo|later|p3)\b/i, /(?<=^|\s)(!)(?=\s|$)/]; // exactly !

    // Priority Parsing Logic (Strongest to weakest)
    function checkPriority(patterns: RegExp[], prioValue: 'high' | 'medium' | 'low') {
        for (const p of patterns) {
            const match = cleanTitle.match(p);
            if (match) {
                if (!priority) priority = prioValue; // Set only the strongest priority
                matchedTokens.push({ text: match[0], type: 'priority' });
                cleanTitle = cleanTitle.replace(p, '');
            }
        }
    }

    checkPriority(highPatterns, 'high');
    if (!priority) checkPriority(medPatterns, 'medium');
    if (!priority) checkPriority(lowPatterns, 'low');

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    // Launch Date Variables (Declared early for Recurrence overlap)
    let launchDate: number | undefined;
    const today = startOfDay(new Date());

    // 3. Recurrence Detection
    let recurrence: RecurrenceInterval | undefined;
    const recurrenceMap: Record<string, RecurrenceInterval> = {
        'daily': 'daily', 'every day': 'daily', 'everyday': 'daily', 'each day': 'daily',
        'weekdays': 'daily', 'every weekday': 'daily',
        'weekends': 'weekly', 'every weekend': 'weekly',
        'weekly': 'weekly', 'every week': 'weekly', 'every other week': 'weekly',
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
            recurrence = parseInt(match[1]) as any;
            matchedTokens.push({ text: match[0], type: 'recurrence' });
            cleanTitle = cleanTitle.replace(everyNDaysRegex, '');
        }
    }

    const everyDayOfWeekRegex = new RegExp(`\\bevery (${daysOfWeek.join('|')}|${shortDays.join('|')})\\b`, 'i');
    if (everyDayOfWeekRegex.test(cleanTitle)) {
        const match = cleanTitle.match(everyDayOfWeekRegex);
        if (match) {
            recurrence = 'weekly';
            matchedTokens.push({ text: match[0], type: 'recurrence' });
            cleanTitle = cleanTitle.replace(everyDayOfWeekRegex, match[1]);
        }
    }

    // "Mondays", "Wednesdays", etc.
    const pluralDaysOfWeekRegex = new RegExp(`\\b(${daysOfWeek.join('|')}|${shortDays.join('|')})s\\b`, 'i');
    if (pluralDaysOfWeekRegex.test(cleanTitle)) {
        const match = cleanTitle.match(pluralDaysOfWeekRegex);
        if (match) {
            recurrence = 'weekly';
            matchedTokens.push({ text: match[0], type: 'recurrence' });
            // Extract the base day
            cleanTitle = cleanTitle.replace(pluralDaysOfWeekRegex, match[1]);
        }
    }

    // "every 15th", "every 2nd"
    const everyNthRegex = /\bevery (\d{1,2})(st|nd|rd|th)?\b/i;
    if (everyNthRegex.test(cleanTitle)) {
        const match = cleanTitle.match(everyNthRegex);
        if (match) {
            const dateNum = parseInt(match[1]);
            if (dateNum >= 1 && dateNum <= 31) {
                recurrence = 'monthly';
                matchedTokens.push({ text: match[0], type: 'recurrence' });
                cleanTitle = cleanTitle.replace(everyNthRegex, '');

                // Set the launch date to the next occurrence of this date
                const todayForMath = startOfDay(new Date());
                let setDate = new Date(todayForMath.getFullYear(), todayForMath.getMonth(), dateNum);
                if (setDate < todayForMath) {
                    setDate = addMonths(setDate, 1);
                }
                launchDate = setDate.getTime();
            }
        }
    }

    if (!recurrence) {
        // Sort keys by length desc to match longer phrases first
        const recurrenceKeys = Object.keys(recurrenceMap).sort((a, b) => b.length - a.length);

        for (const key of recurrenceKeys) {
            const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i');
            if (regex.test(cleanTitle)) {
                recurrence = recurrenceMap[key];
                matchedTokens.push({ text: key, type: 'recurrence' });
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
            const match = cleanTitle.match(tagRegex);
            if (match) {
                projectId = project.id;
                matchedTokens.push({ text: match[0], type: 'project', color: project.color });
                cleanTitle = cleanTitle.replace(tagRegex, '');
                break;
            }
        }
    }

    if (!projectId) {
        for (const project of sortedProjects) {
            const inRegex = new RegExp(`\\bin ${escapeRegExp(project.name)}\\b`, 'i');
            if (inRegex.test(cleanTitle)) {
                const match = cleanTitle.match(inRegex);
                if (match) {
                    projectId = project.id;
                    matchedTokens.push({ text: match[0], type: 'project', color: project.color });
                    cleanTitle = cleanTitle.replace(inRegex, '');
                    break;
                }
            }
        }
    }

    if (!projectId) {
        for (const project of sortedProjects) {
            const prefixRegex = new RegExp(`\\b(?:category|project|folder)\\s+${escapeRegExp(project.name)}\\b`, 'i');
            if (prefixRegex.test(cleanTitle)) {
                const match = cleanTitle.match(prefixRegex);
                if (match) {
                    projectId = project.id;
                    matchedTokens.push({ text: match[0], type: 'project', color: project.color });
                    cleanTitle = cleanTitle.replace(prefixRegex, '');
                    break;
                }
            }
        }
    }

    // 5. Launch Date Detection

    // Extended Date Patterns
    const datePatterns = [
        { regex: /\b(today|tonight|tdy)\b/i, handler: () => today },
        { regex: /\b(tomorrow|tmr|tmw)\b/i, handler: () => addDays(today, 1) },
        { regex: /\b(next week)\b/i, handler: () => addWeeks(today, 1) },
        { regex: /\b(eow|end of week)\b/i, handler: () => nextDay(today, 5) }, // Friday
        { regex: /\b(eod)\b/i, handler: () => today }, // End of Day = Today
    ];

    // Extended Date Patterns

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
            launchDate = addDays(today, parseInt(match[1])).getTime();
            matchedTokens.push({ text: match[0], type: 'date' });
            cleanTitle = cleanTitle.replace(inDaysRegex, '');
            dateMatched = true;
        }
    } else if (inWeeksRegex.test(cleanTitle)) {
        const match = cleanTitle.match(inWeeksRegex);
        if (match) {
            launchDate = addWeeks(today, parseInt(match[1])).getTime();
            matchedTokens.push({ text: match[0], type: 'date' });
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
            launchDate = setDate.getTime();
            matchedTokens.push({ text: match[0], type: 'date' });
            cleanTitle = cleanTitle.replace(monthDateRegex, '');
            dateMatched = true;
        }
    }

    if (!dateMatched) {
        for (const pattern of datePatterns) {
            if (pattern.regex.test(cleanTitle)) {
                const match = cleanTitle.match(pattern.regex);
                if (match) {
                    launchDate = pattern.handler().getTime();
                    matchedTokens.push({ text: match[0], type: 'date' });
                    cleanTitle = cleanTitle.replace(pattern.regex, '');
                    dateMatched = true;
                    break;
                }
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

            launchDate = setDate.getTime();
            matchedTokens.push({ text: match[0], type: 'date' });
            cleanTitle = cleanTitle.replace(numericDateRegex, '');
            dateMatched = true;
        }
    }

    // 6. Cleanup
    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

    return {
        title: cleanTitle,
        priority,
        launchDate, // Now correctly scoped!
        recurrence,
        projectId,
        duration,
        isFrog,
        isLightning,
        isWaiting,
        isIdea,
        matchedTokens
    };
}
