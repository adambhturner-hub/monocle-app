const assert = require('assert');

let state = {
    tasks: [{id: 1}],
    projects: [],
    settings: { sortMode: 'manual' },
    sessionHistory: []
};

let cloudData = {
    tasks: [{id: 1}],
    projects: [],
    settings: { sortMode: 'manual' },
    sessionHistory: []
};


const incomingStateStr = JSON.stringify({
    tasks: cloudData.tasks || [],
    projects: cloudData.projects || [],
    settings: cloudData.settings,
    sessionHistory: cloudData.sessionHistory || []
});

console.log("incomingStateStr:", incomingStateStr);

// Simulate loadFromCloud
let newState = {
    ...state,
    tasks: cloudData.tasks !== undefined ? cloudData.tasks : state.tasks,
    projects: cloudData.projects !== undefined ? cloudData.projects : state.projects,
    settings: cloudData.settings !== undefined ? { ...state.settings, ...cloudData.settings } : state.settings,
    sessionHistory: cloudData.sessionHistory !== undefined ? cloudData.sessionHistory : state.sessionHistory,
};

const currentStateStr = JSON.stringify({
    tasks: newState.tasks,
    projects: newState.projects,
    settings: newState.settings,
    sessionHistory: newState.sessionHistory
});
console.log("currentStateStr:", currentStateStr);

console.log("Match?", incomingStateStr === currentStateStr);
