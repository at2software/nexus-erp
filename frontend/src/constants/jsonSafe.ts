/**
 * Strips anything the API can't consume (functions, undefined, circulars,
 * class instances with toJSON like moment/Date) by round-tripping through JSON.
 */
export function jsonSafe<T>(v: T): T {
    return v === undefined ? (undefined as any) : JSON.parse(JSON.stringify(v));
}
