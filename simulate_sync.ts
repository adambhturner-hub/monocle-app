const deepStringify = (obj: any): string => {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map(deepStringify).join(',')}]`;
    const keys = Object.keys(obj).sort();
    const props = keys
        .filter(k => obj[k] !== undefined)
        .map(k => `"${k}":${deepStringify(obj[k])}`);
    return `{${props.join(',')}}`;
};

const removeUndefined = (obj: any): any => {
    if (obj === undefined) return null; // Firestore accepts null
    if (obj === null) return null;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                result[key] = removeUndefined(obj[key]);
            }
        }
        return result;
    }
    return obj;
};

// Initial state
let state = {
    tasks: [{ id: "1", title: "Task", isFrog: undefined, isAvoidedFrog: undefined }],
    projects: [],
    deletedIds: [],
    settings: {
        sortMode: 'manual',
    },
    sessionHistory: [],
    lastModified: 100
};

let lastSyncedStateStrRef = "";

console.log("=== START PUSH ==");
let currentStateStr = deepStringify(state);
let safePayload = removeUndefined(state);
let firestoreDb = JSON.parse(JSON.stringify(safePayload));
lastSyncedStateStrRef = currentStateStr;
console.log("lastSyncedStateStrRef = ", lastSyncedStateStrRef);


console.log("\n=== START PULL (Firestore Echo) ===");
let cloudData = firestoreDb;
let incomingStateStr = deepStringify(cloudData);

console.log("incomingStateStr =", incomingStateStr);

if (incomingStateStr !== lastSyncedStateStrRef) {
    console.log("MISMATCH! Loop triggered!");
    console.log("incomingStateStr    :", incomingStateStr);
    console.log("lastSyncedStateStrRef :", lastSyncedStateStrRef);
} else {
    console.log("Match. No loop.");
}
