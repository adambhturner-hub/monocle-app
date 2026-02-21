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

const mergeById = (local, cloud) => {
    const localMap = new Map(local.map(item => [item.id, item]));
    const mergedMap = new Map();
    cloud.forEach(item => mergedMap.set(item.id, item));
    localMap.forEach((item, id) => {
        if (!mergedMap.has(id)) {
            mergedMap.set(id, item);
        }
    });
    return Array.from(mergedMap.values());
};

let webState = { tasks: [{ id: "W", title: "Web" }], settings: { a: 1 } };
let phoneState = { tasks: [{ id: "P", title: "Phone" }], settings: { a: 1 } };
let cloudData = null;

function push(device, state) {
    cloudData = JSON.parse(JSON.stringify(state)); // simulate removeUndefined
}

function pull(device, state) {
    const incomingStr = deepStringify({
        tasks: cloudData.tasks || [],
        settings: cloudData.settings,
    });
    const lastStr = device.lastStr || '';
    if (incomingStr !== lastStr) {
        device.lastStr = incomingStr;
        // loadFromCloud
        state.tasks = mergeById(state.tasks, cloudData.tasks || []);
        state.settings = { ...state.settings, ...(cloudData.settings || {}) };

        // subscribe fires
        const currentStr = deepStringify({
            tasks: state.tasks,
            settings: state.settings,
        });
        if (currentStr !== device.lastStr) {
            push(device, state);
            device.lastStr = currentStr;
            return true; // pushed back
        }
    }
    return false;
}

let web = { lastStr: deepStringify(webState) };
let phone = { lastStr: deepStringify(phoneState) };

push(web, webState);
console.log("Cloud after Web push:", cloudData.tasks);

let phonePush = pull(phone, phoneState);
console.log("Phone state after pull:", phoneState.tasks);
console.log("Did phone push back?", phonePush);
console.log("Cloud after Phone pull:", cloudData.tasks);

let webPush = pull(web, webState);
console.log("Web state after pull:", webState.tasks);
console.log("Did web push back?", webPush);
console.log("Cloud after Web pull:", cloudData.tasks);
