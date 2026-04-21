'use client';

import { useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { useMonocleStore } from '@/lib/store';
import { onAuthStateChanged } from 'firebase/auth';
import { doc as firestoreDoc, onSnapshot as firestoreOnSnapshot, setDoc as firestoreSetDoc } from 'firebase/firestore';
import { toast } from 'sonner';

// Helper to recursively strip undefined values before pushing to Firestore
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

// Helper to stringify deterministically, sorting object keys to avoid infinite sync loops 
// when Firestore alters key insertion order
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

export function SyncEngine() {
    const isHydrated = useMonocleStore(state => state.isHydrated);
    const store = useMonocleStore();

    // Track the serialized state of the last known synced data.
    // This allows us to break infinite loops between Zustand and Firestore.
    const lastSyncedStateStrRef = useRef<string>('');

    // Prevent pushing local state to the cloud until we have received at least one 
    // snapshot from the cloud, otherwise LocalStorage hydration will overwrite the cloud instantly.
    const isCloudReadyRef = useRef<boolean>(false);

    // Track the highest lastModified timestamp we've seen from the server
    const serverLastModifiedRef = useRef<number>(0);

    // 0. Listen to Hardware Network Connectivity
    useEffect(() => {
        const handleOnline = () => store.setSyncStatus('idle');
        const handleOffline = () => store.setSyncStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        if (!navigator.onLine) {
            store.setSyncStatus('offline');
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [store]);

    // 1. Listen to Cloud Changes
    useEffect(() => {
        if (!isHydrated) return;

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                const userDocRef = firestoreDoc(db, 'users', user.uid);

                // Set up real-time listener
                const unsubscribeSnapshot = firestoreOnSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const cloudData = docSnap.data();

                        // Create a normalized string of the incoming syncable data
                        const incomingStateStr = deepStringify({
                            tasks: cloudData.tasks || [],
                            projects: cloudData.projects || [],
                            deletedIds: cloudData.deletedIds || [],
                            settings: cloudData.settings,
                            sessionHistory: cloudData.sessionHistory || [],
                            habits: cloudData.habits || [],
                            timeBlocks: cloudData.timeBlocks || [],
                            lastReviewDate: cloudData.lastReviewDate,
                            lastShutdownDate: cloudData.lastShutdownDate,
                            lastActiveDate: cloudData.lastActiveDate,
                            lastModified: cloudData.lastModified || 0
                        });

                        // We have successfully received data from the cloud, it is now safe to push local mutations
                        isCloudReadyRef.current = true;

                        // Update our knowledge of the server's timestamp
                        if (cloudData.lastModified) {
                            serverLastModifiedRef.current = cloudData.lastModified;
                        }

                        // Only load from cloud if the data is actually different from what we last synced
                        if (incomingStateStr !== lastSyncedStateStrRef.current) {
                            console.log("[Monocle Sync] Pulling payload from Firestore");
                            lastSyncedStateStrRef.current = incomingStateStr;

                            useMonocleStore.getState().loadFromCloud({
                                tasks: cloudData.tasks || [],
                                projects: cloudData.projects || [],
                                deletedIds: cloudData.deletedIds || [],
                                settings: cloudData.settings,
                                sessionHistory: cloudData.sessionHistory || [],
                                habits: cloudData.habits || [],
                                timeBlocks: cloudData.timeBlocks || [],
                                lastReviewDate: cloudData.lastReviewDate,
                                lastShutdownDate: cloudData.lastShutdownDate,
                                lastActiveDate: cloudData.lastActiveDate,
                                lastModified: cloudData.lastModified,
                            });
                            useMonocleStore.getState().setLastSyncTime(Date.now());
                        }
                    } else {
                        // User exists but has no cloud document yet (first login / account creation)
                        console.log("[Monocle Sync] Initializing new cloud document for user");

                        // Check if the local state belongs to a real offline user or if it's phantom leakage
                        let state = useMonocleStore.getState();

                        if (!state.settings.hasSeenOnboarding) {
                            // This is a brand new account (or an uncleared cache from a previous logout)
                            // Wipe the phantom state to prevent cross-account task leakage
                            console.log("[Monocle Sync] Wiping phantom local state before cloud init");
                            state.clearData();
                            // Fetch the cleaned state
                            state = useMonocleStore.getState();
                        } else {
                            console.log("[Monocle Sync] Preserving offline local data for new cloud account");
                        }

                        // It's safe to push now that we know the cloud is empty
                        isCloudReadyRef.current = true;

                        const rawPayload = {
                            tasks: state.tasks,
                            projects: state.projects,
                            deletedIds: state.deletedIds,
                            settings: state.settings,
                            sessionHistory: state.sessionHistory,
                            habits: state.habits,
                            timeBlocks: state.timeBlocks,
                            lastReviewDate: state.lastReviewDate,
                            lastShutdownDate: state.lastShutdownDate,
                            lastActiveDate: state.lastActiveDate,
                            lastModified: state.lastModified || Date.now()
                        };

                        // Throttle: If we are ping-ponging constantly, abort.
                        const nowTimestamp = Date.now();
                        if ((window as any)._lastPushTime && nowTimestamp - (window as any)._lastPushTime < 2000) {
                            console.error("[Monocle Sync] Throttling infinite push loop!");
                            return;
                        }
                        (window as any)._lastPushTime = nowTimestamp;

                        const safePayload = removeUndefined(rawPayload);

                        // Update our ref so we don't bounce our own initial snapshot back
                        lastSyncedStateStrRef.current = deepStringify({
                            tasks: state.tasks,
                            projects: state.projects,
                            deletedIds: state.deletedIds,
                            settings: state.settings,
                            sessionHistory: state.sessionHistory,
                            habits: state.habits,
                            timeBlocks: state.timeBlocks,
                            lastReviewDate: state.lastReviewDate,
                            lastShutdownDate: state.lastShutdownDate,
                            lastActiveDate: state.lastActiveDate,
                            lastModified: state.lastModified || Date.now()
                        });

                        serverLastModifiedRef.current = rawPayload.lastModified;

                        firestoreSetDoc(userDocRef, safePayload, { merge: true }).then(() => {
                            useMonocleStore.getState().setSyncStatus('idle');
                            useMonocleStore.getState().setSyncErrorDetails(undefined);
                        }).catch(err => {
                            console.error("Failed to initialize cloud document:", err);
                            const errMsg = err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err)) || String(err);
                            useMonocleStore.getState().setSyncErrorDetails(errMsg);
                            useMonocleStore.getState().setSyncStatus('error');
                            toast.error("Sync Error", { description: "Failed to initialize cloud document. Check Firebase rules." });
                        });
                    }
                }, (error) => {
                    console.error("Firestore Snapshot Error:", error);
                    const errMsg = error?.message || JSON.stringify(error, Object.getOwnPropertyNames(error)) || String(error);
                    useMonocleStore.getState().setSyncErrorDetails(errMsg);
                    useMonocleStore.getState().setSyncStatus('error');
                    toast.error("Sync Disconnected", { description: "You don't have permission to read from the cloud. Check Firebase Rules." });
                });

                return () => unsubscribeSnapshot();
            }
        });

        return () => unsubscribeAuth();
    }, [isHydrated]);

    // 2. Push Local Changes to Cloud
    useEffect(() => {
        if (!isHydrated) return;

        const unsubscribeStore = useMonocleStore.subscribe((state, prevState) => {
            const user = auth.currentUser;
            if (!user) return;

            // Determine if syncable data actually changed locally
            const didSyncableDataChange =
                state.tasks !== prevState.tasks ||
                state.projects !== prevState.projects ||
                state.deletedIds !== prevState.deletedIds ||
                state.settings !== prevState.settings ||
                state.sessionHistory !== prevState.sessionHistory ||
                state.habits !== prevState.habits ||
                state.timeBlocks !== prevState.timeBlocks ||
                state.lastReviewDate !== prevState.lastReviewDate ||
                state.lastShutdownDate !== prevState.lastShutdownDate ||
                state.lastActiveDate !== prevState.lastActiveDate ||
                state.lastModified !== prevState.lastModified;

            // Only push if data changed AND we have already performed our initial pull from the network
            if (didSyncableDataChange && isCloudReadyRef.current) {

                // --- CONFLICT RESOLUTION ---
                // If our local Zustand state's lastModified timestamp is OLDER than the server's,
                // this means our local client is holding stale offline data and is trying to overwrite
                // newer remote data. We abort the push entirely. 
                if ((state.lastModified || 0) < serverLastModifiedRef.current) {
                    console.log("[Monocle Sync] Aborting push: Local data is stale compared to cloud timestamp.");
                    return;
                }

                // Create a literal representation of the current syncable state
                const currentStateStr = deepStringify({
                    tasks: state.tasks,
                    projects: state.projects,
                    deletedIds: state.deletedIds,
                    settings: state.settings,
                    sessionHistory: state.sessionHistory,
                    habits: state.habits,
                    timeBlocks: state.timeBlocks,
                    lastReviewDate: state.lastReviewDate,
                    lastShutdownDate: state.lastShutdownDate,
                    lastActiveDate: state.lastActiveDate,
                    lastModified: state.lastModified || 0
                });

                // If this state exactly matches the last state we synced from/to the cloud,
                // this state change was just Zustand reflecting the `loadFromCloud` action. Ignore it.
                if (currentStateStr === lastSyncedStateStrRef.current) {
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
                    } catch (e) { }
                }

                const userDocRef = firestoreDoc(db, 'users', user.uid);

                const rawPayload = {
                    tasks: state.tasks,
                    projects: state.projects,
                    deletedIds: state.deletedIds,
                    settings: state.settings,
                    sessionHistory: state.sessionHistory,
                    habits: state.habits,
                    timeBlocks: state.timeBlocks,
                    lastReviewDate: state.lastReviewDate,
                    lastShutdownDate: state.lastShutdownDate,
                    lastActiveDate: state.lastActiveDate,
                    lastModified: state.lastModified || Date.now()
                };

                // Throttle: If we are ping-ponging constantly, abort.
                const nowTimestamp = Date.now();
                if ((window as any)._lastPushTime && nowTimestamp - (window as any)._lastPushTime < 3000) {
                    console.error("[Monocle Sync] Throttling infinite push loop! Aborting push.");
                    useMonocleStore.getState().setSyncStatus('idle');
                    return;
                }
                (window as any)._lastPushTime = nowTimestamp;

                const safePayload = removeUndefined(rawPayload);
                console.log("[Monocle Sync] Pushing payload to Firestore");
                useMonocleStore.getState().setSyncStatus('syncing');

                // Update our strings and timestamps so our own snapshot echo doesn't trigger a pull
                lastSyncedStateStrRef.current = currentStateStr;
                serverLastModifiedRef.current = rawPayload.lastModified;

                firestoreSetDoc(userDocRef, safePayload, { merge: true }).then(() => {
                    useMonocleStore.getState().setLastSyncTime(Date.now());
                    useMonocleStore.getState().setSyncStatus('idle');
                    useMonocleStore.getState().setSyncErrorDetails(undefined);
                }).catch((err: any) => {
                    console.error("Failed to sync to cloud:", err);
                    const errMsg = err?.message || JSON.stringify(err, Object.getOwnPropertyNames(err)) || String(err);
                    useMonocleStore.getState().setSyncErrorDetails(errMsg);
                    useMonocleStore.getState().setSyncStatus('error');
                    toast.error(`Sync Failed`, { description: err.message || "Could not save your changes to the cloud. They are saved locally." });
                });
            }
        });

        return () => unsubscribeStore();
    }, [isHydrated]);

    return null;
}
