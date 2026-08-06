import { Dictionary } from '@constants/constants';
import type { Serializable } from '@models/_core/serializable';

// Structural instead of `instanceof`: importing Serializable as a value cycles back
// here via nx.static -> modals, which resolves to undefined under native ESM.
const isSerializable = (source: object): source is Serializable => typeof (source as Partial<Serializable>).getClone === 'function';

export const deepCopy = <T>(source: T): T => {
    if (Array.isArray(source)) return source.map((item) => deepCopy(item)) as T;
    if (source instanceof Date) return new Date(source.getTime()) as T;
    if (source && typeof source === 'object' && isSerializable(source)) return source.getClone() as T;
    if (source && typeof source === 'object') {
        return Object.getOwnPropertyNames(source).reduce(
            (o, prop) => {
                Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!);
                o[prop] = deepCopy((source as Dictionary<any>)[prop]);
                return o;
            },
            Object.create(Object.getPrototypeOf(source)),
        );
    }
    return source;
};
