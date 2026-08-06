import { Dictionary } from "../constants";

const isObject = (value: unknown): value is Dictionary => !!value && typeof value === 'object' && !Array.isArray(value);

function deepMergeInner(target: Dictionary, source: Dictionary): Dictionary {
    Object.keys(source).forEach((key: string) => {
        const targetValue = target[key];
        const sourceValue = source[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            target[key] = targetValue.concat(sourceValue);
        } else if (isObject(targetValue) && isObject(sourceValue)) {
            target[key] = deepMergeInner(Object.assign({}, targetValue), sourceValue);
        } else {
            target[key] = sourceValue;
        }
    });
    return target;
}

export const deepMerge = <T extends Dictionary>(...objects: T[]): T => {
    if (objects.length < 2) throw new Error('deepMerge: this function expects at least 2 objects to be provided');

    if (objects.some((object) => !isObject(object))) throw new Error('deepMerge: all values should be of type "object"');

    const target = objects.shift();
    if (!target) throw new Error('deepMerge: missing target object');

    while (objects.length > 0) {
        const source = objects.shift();
        if (source) deepMergeInner(target, source);
    }
    return target;
};
