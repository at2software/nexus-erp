export const objectMap = <T>(obj: Record<string, T>, fn: (input: T, key: string, i: any) => any) =>
    Object.fromEntries(
        Object.entries(obj).map(
            ([k, v], i) => [k, fn(v, k, i)]
        )
    )
// filters key-value-objects and removes all keys that are either null/undefined or empty arrays
export const objectRemoveEmpty = <T>(obj: Record<string, T>) =>
    Object.fromEntries(
        Object.entries(obj).
            map(([k, v]) => [k, v]).
            filter(_ => Array.isArray(_[1]) ? _[1].length > 0 : _[1])
    )