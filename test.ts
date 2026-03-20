import { parseTaskInput } from './src/lib/smart-parser';
const result = parseTaskInput("Drink a glass of water !habit");
console.log(JSON.stringify(result, null, 2));
