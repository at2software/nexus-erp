
export const mergeArraysToMap = (keys: string[], values: string[]): Record<string, string> => {
    if (keys.length !== values.length) {
        throw new Error("The number of keys and values must be the same.");
    }
    const mergedMap: Record<string, string> = keys.reduce((map: any, key, index) => {
        map[key] = values[index];
        return map;
    }, {});
    return mergedMap;
}