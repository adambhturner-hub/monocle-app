console.log("----- MONOCLE FIREBASE DEBUG -----");
indexedDB.databases().then(dbs => {
    console.log("IndexedDB Databases:", dbs.map(d => d.name));
    
    // Check if the firebase auth db exists
    const hasAuth = dbs.some(d => d.name === "firebaseLocalStorageDb");
    const hasFirestore = dbs.some(d => d.name.startsWith("firestore/"));
    console.log("Has Auth Cache:", hasAuth);
    console.log("Has Firestore Cache:", hasFirestore);
});

// Try to grab the raw Zustand State
const rawZustandStr = localStorage.getItem("monocle-storage");
if (rawZustandStr) {
    try {
        const p = JSON.parse(rawZustandStr);
        console.log("Local Task Count:", p.state?.tasks?.length);
        console.log("Local Project Count:", p.state?.projects?.length);
        console.log("Local Deleted Count:", p.state?.deletedIds?.length);
        console.log("Local Sync Status:", p.state?.syncStatus);
        console.log("Local Last Modified:", new Date(p.state?.lastModified || 0).toISOString());
    } catch(e) {
        console.error("Failed to parse Zustand state", e);
    }
}
console.log("----------------------------------");
