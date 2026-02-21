// A quick script to verify what our `removeUndefined` function is returning
const removeUndefined = (obj) => {
    if (obj === undefined) return null;
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

const rawPayload = {
    tasks: [],
    projects: [],
    settings: {
        sortMode: 'manual',
        archiveRetention: 30,
        autoPickOverdue: true,
        skipCooldown: 360,
        soundEnabled: true,
        hasSeenOnboarding: false
    },
    sessionHistory: [],
    updatedAt: Date.now()
};

const safePayload = removeUndefined(rawPayload);
console.dir(safePayload, { depth: null });
console.log("JSON Stringify:", JSON.stringify(safePayload));
