export function jsonSafe<T>(v: T): T {
    return v === undefined ? (undefined as any) : JSON.parse(JSON.stringify(v));
}
