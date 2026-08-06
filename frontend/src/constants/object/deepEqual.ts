import { Dictionary } from '@constants/constants';

export function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        const bArr = b as unknown[];
        if (a.length !== bArr.length) return false;
        for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], bArr[i])) return false;
        return true;
    }
    const ao = a as unknown as Dictionary;
    const bo = b as unknown as Dictionary;
    const ka = Object.keys(ao),
        kb = Object.keys(bo);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(ao[k], bo[k])) return false;
    return true;
}
