const fs = require('fs');
let code = fs.readFileSync('src/components/sync-engine.tsx', 'utf8');

// Add diffing logs before pushing
code = code.replace(
    /if \(currentStateStr === lastSyncedStateStrRef\.current\) {\n\s*return;\n\s*}/,
    `if (currentStateStr === lastSyncedStateStrRef.current) {
                    return;
                }

                // --- DIFF DEBUGGING ---
                // If we reach here, we are pushing. Find exactly what triggered it to help users report bugs!
                if (lastSyncedStateStrRef.current) {
                    try {
                        let diffObj: any = {};
                        const oldObj = JSON.parse(lastSyncedStateStrRef.current);
                        const newObj = JSON.parse(currentStateStr);
                        for (const key in newObj) {
                            if (JSON.stringify(newObj[key]) !== JSON.stringify(oldObj[key])) {
                                diffObj[key] = { old: oldObj[key], new: newObj[key] };
                            }
                        }
                        for (const key in oldObj) {
                            if (!newObj.hasOwnProperty(key)) {
                                diffObj[key] = { old: oldObj[key], new: undefined };
                            }
                        }
                        if (Object.keys(diffObj).length > 0) {
                            console.warn("[Monocle Sync] Loop Dectected! Divergent fields:", JSON.stringify(diffObj, null, 2));
                        }
                    } catch(e) {}
                }`
);

// We should also throttle the push!
// If we pushed less than 1 second ago, do not push! (Wait, Zustand will still have the divergent state so it will retry later? No, it only pushes on transition).
// Actually, let's just make it NOT infinite loop.
code = code.replace(
    /const safePayload = removeUndefined\(rawPayload\);/,
    `// Throttle: If we are ping-ponging constantly, abort.
                const nowTimestamp = Date.now();
                if ((window as any)._lastPushTime && nowTimestamp - (window as any)._lastPushTime < 2000) {
                    console.error("[Monocle Sync] Throttling infinite push loop!");
                    return;
                }
                (window as any)._lastPushTime = nowTimestamp;
                
                const safePayload = removeUndefined(rawPayload);`
);

fs.writeFileSync('src/components/sync-engine.tsx', code);
