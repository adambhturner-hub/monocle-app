const deepStringify = (obj) => {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map(deepStringify).join(',')}]`;
    const keys = Object.keys(obj).sort();
    const props = keys
        .filter(k => obj[k] !== undefined)
        .map(k => `"${k}":${deepStringify(obj[k])}`);
    return `{${props.join(',')}}`;
};

const removeUndefined = (obj) => {
    if (obj === undefined) return null; // Firestore accepts null
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                result[key] = removeUndefined(obj[key]);
            }
        }
        return result;
    }
    return obj;
};

const state = {
    tasks: [{ id: '1', title: 'Task 1' }],
    projects: [],
    deletedIds: [],
    settings: {
        sortMode: 'manual',
        weeklyInsight: undefined
    },
    sessionHistory: [],
    lastModified: 100
};

const currentStateStr = deepStringify(state);
console.log("currentStateStr:\n", currentStateStr);

const safePayload = removeUndefined(state);
// cloudData is basically safePayload when fetched from firestore
const incomingStateStr = deepStringify(safePayload);
console.log("incomingStateStr:\n", incomingStateStr);

console.log("Match?", currentStateStr === incomingStateStr);

