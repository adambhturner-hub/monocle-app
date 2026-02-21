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

// Initial state exactly like Monocle
let state = {
    tasks: [],
    projects: [],
    settings: {
        sortMode: 'manual',
        archiveRetention: 30,
        autoPickOverdue: true,
        skipCooldown: 360,
        hasSeenOnboarding: false,
        soundEnabled: true
    },
    sessionHistory: []
};

// Add a task
state.tasks.push({
    id: "uuid1",
    title: "Test Task",
    status: "todo",
    priority: "low",
    createdAt: 1700000000000,
    projectId: undefined, // undefined field!
    isDraft: false
});

// PUSH step
const currentStateStr = deepStringify({
    tasks: state.tasks,
    projects: state.projects,
    settings: state.settings,
    sessionHistory: state.sessionHistory
});

const rawPayload = {
    tasks: state.tasks,
    projects: state.projects,
    settings: state.settings,
    sessionHistory: state.sessionHistory,
    updatedAt: Date.now()
};

const safePayload = removeUndefined(rawPayload);
// Simulate Firestore storing it and returning it (parsing back to JSON basically)
const cloudData = JSON.parse(JSON.stringify(safePayload)); 

// PULL step
const incomingStateStr = deepStringify({
    tasks: cloudData.tasks || [],
    projects: cloudData.projects || [],
    settings: cloudData.settings,
    sessionHistory: cloudData.sessionHistory || []
});

console.log("currentStateStr === incomingStateStr?", currentStateStr === incomingStateStr);
if (currentStateStr !== incomingStateStr) {
    console.log("current:", currentStateStr);
    console.log("incoming:", incomingStateStr);
}

