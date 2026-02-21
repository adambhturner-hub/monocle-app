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
    const store = useMonocleStore();

    // Track the serialized state of the last known synced data.
    // This allows us to break infinite loops between Zustand and Firestore.
    const lastSyncedStateStrRef = useRef<string>('');

    // Prevent pushing local state to the cloud until we have received at least one 
    // snapshot from the cloud, otherwise LocalStorage hydration will overwrite the cloud instantly.
    const isCloudReadyRef = useRef<boolean>(false);

    // 1. Listen to Cloud Changes
    useEffect(() => {
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
                            settings: cloudData.settings,
                            sessionHistory: cloudData.sessionHistory || []
                        });

                        // We have successfully received data from the cloud, it is now safe to push local mutations
                        isCloudReadyRef.current = true;

                        // Only load from cloud if the data is actually different from what we last synced
                        if (incomingStateStr !== lastSyncedStateStrRef.current) {
                            console.log("[Monocle Sync] Pulling payload from Firestore");
                            lastSyncedStateStrRef.current = incomingStateStr;

                            useMonocleStore.getState().loadFromCloud({
                                tasks: cloudData.tasks || [],
                                projects: cloudData.projects || [],
                                settings: cloudData.settings,
                                sessionHistory: cloudData.sessionHistory || [],
                            });
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
                            settings: state.settings,
                            sessionHistory: state.sessionHistory,
                            updatedAt: Date.now()
                        };

                        const safePayload = removeUndefined(rawPayload);

                        // Update our ref so we don't bounce our own initial snapshot back
                        lastSyncedStateStrRef.current = deepStringify({
                            tasks: state.tasks,
                            projects: state.projects,
                            settings: state.settings,
                            sessionHistory: state.sessionHistory
                        });

                        firestoreSetDoc(userDocRef, safePayload, { merge: true }).catch(err => {
                            console.error("Failed to initialize cloud document:", err);
                            toast.error("Sync Error", { description: "Failed to initialize cloud document. Check Firebase rules." });
                        });
                    }
                }, (error) => {
                    console.error("Firestore Snapshot Error:", error);
                    toast.error("Sync Disconnected", { description: "You don't have permission to read from the cloud. Check Firebase Rules." });
                });

                return () => unsubscribeSnapshot();
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // 2. Push Local Changes to Cloud
    useEffect(() => {
        const unsubscribeStore = useMonocleStore.subscribe((state, prevState) => {
            const user = auth.currentUser;
            if (!user) return;

            // Determine if syncable data actually changed locally
            const didSyncableDataChange =
                state.tasks !== prevState.tasks ||
                state.projects !== prevState.projects ||
                state.settings !== prevState.settings ||
                state.sessionHistory !== prevState.sessionHistory;

            // Only push if data changed AND we have already performed our initial pull from the network
            if (didSyncableDataChange && isCloudReadyRef.current) {
                // Create a literal representation of the current syncable state
                const currentStateStr = deepStringify({
                    tasks: state.tasks,
                    projects: state.projects,
                    settings: state.settings,
                    sessionHistory: state.sessionHistory
                });

                // If this state exactly matches the last state we synced from/to the cloud,
                // this state change was just Zustand reflecting the `loadFromCloud` action. Ignore it.
                if (currentStateStr === lastSyncedStateStrRef.current) {
                    return;
                }

                const userDocRef = firestoreDoc(db, 'users', user.uid);

                const rawPayload = {
                    tasks: state.tasks,
                    projects: state.projects,
                    settings: state.settings,
                    sessionHistory: state.sessionHistory,
                    updatedAt: Date.now()
                };

                const safePayload = removeUndefined(rawPayload);
                console.log("[Monocle Sync] Pushing payload to Firestore");

                // Update our ref so our own snapshot echo doesn't trigger a pull
                lastSyncedStateStrRef.current = currentStateStr;

                firestoreSetDoc(userDocRef, safePayload, { merge: true }).catch((err: any) => {
                    console.error("Failed to sync to cloud:", err);
                    toast.error(`Sync Failed`, { description: err.message || "Could not save your changes to the cloud. They are saved locally." });
                });
            }
        });

        return () => unsubscribeStore();
    }, []);

    return null;
}
