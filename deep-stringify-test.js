function deepStringify(obj) {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map(deepStringify).join(',')}]`;
    const keys = Object.keys(obj).sort();
    const props = keys
        .filter(k => obj[k] !== undefined)
        .map(k => `"${k}":${deepStringify(obj[k])}`);
    return `{${props.join(',')}}`;
}

const obj1 = { b: 2, a: 1, c: { y: 2, x: 1 } };
const obj2 = { a: 1, c: { x: 1, y: 2, z: undefined }, b: 2 };

console.log(deepStringify(obj1) === deepStringify(obj2));
console.log(deepStringify(obj1));
