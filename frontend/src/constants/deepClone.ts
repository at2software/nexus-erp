import { Serializable } from "src/models/serializable"

export const deepCopy = <T>(source: T): T => {
    if (Array.isArray(source)) return source.map(item => deepCopy(item)) as T
    if (source instanceof Date) return new Date(source.getTime()) as T
    if (source instanceof Serializable) return source.getClone() as T
    if (source && typeof source === 'object') {
        return Object.getOwnPropertyNames(source).reduce((o, prop) => {
            Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!);
            o[prop] = deepCopy((source as Record<string, any>)[prop]);
            return o;
        }, Object.create(Object.getPrototypeOf(source)))
    }
    return source
}