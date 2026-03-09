import { parseTaskInput } from './src/lib/smart-parser';

const res1 = parseTaskInput("wait test");
console.log("res1", res1);

const res2 = parseTaskInput("testing wait");
console.log("res2", res2);
