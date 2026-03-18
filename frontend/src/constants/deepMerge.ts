export const deepMerge = (...objects: any[]) => {
    
    if (objects.length < 2) throw new Error('deepMerge: this function expects at least 2 objects to be provided');

    const isObject = (_: any) => _ && typeof _ === 'object';

    function deepMergeInner(target: any, source: any) {
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
        })
        return target;
    }

    if (objects.some(object => !isObject(object))) throw new Error('deepMerge: all values should be of type "object"');

    const target = objects.shift();

    while (objects.length > 0) {
        const source = objects.shift();
        deepMergeInner(target, source);
    }

    return target;
}