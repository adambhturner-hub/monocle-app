const resetTitle = "Eat breakfast m, w, f";
const regexChoices = [
    'monday', 'mon', 'm',
    'tuesday', 'tue', 'tu',
    'wednesday', 'wed', 'w',
    'thursday', 'thu', 'th',
    'friday', 'fri', 'f',
    'saturday', 'sat', 'sa',
    'sunday', 'sun', 'su'
].join('|');

const dayExtractionRegex = new RegExp(`(?:\\b|^)(?:every\\s+)?(${regexChoices})s?(?=\\b|,|$)`, 'gi');

console.log("Testing:", resetTitle);
let dayMatch;
const foundDays = [];
while ((dayMatch = dayExtractionRegex.exec(resetTitle)) !== null) {
    foundDays.push({match: dayMatch[0], index: dayMatch.index, group: dayMatch[1]});
}
console.log("Found:", foundDays);
