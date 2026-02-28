import { parseTaskInput } from './src/lib/smart-parser';

const tests = [
    "Survivor wednesdays",
    "Pay rent every 15th",
    "Review numbers every weekday",
    "Family call every weekend",
    "Brush teeth each day",
    "Update yearly",
    "Meeting every other week"
];

tests.forEach(t => {
    console.log(`Input: "${t}"`);
    console.log(JSON.stringify(parseTaskInput(t), null, 2));
    console.log("-----------------------");
});
