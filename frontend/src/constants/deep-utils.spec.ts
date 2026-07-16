jest.mock('@models/serializable', () => {
    class Serializable {
        getClone() {
            return { copied: true };
        }
    }
    return { Serializable };
});

import { deepCopy } from '@constants/deepClone';
import { deepEqual } from '@constants/deepEqual';
import { deepMerge } from '@constants/deepMerge';
import { Serializable } from '@models/serializable';

class ProtoObject {
    value: number;
    constructor(value: number) {
        this.value = value;
    }

    get doubled(): number {
        return this.value * 2;
    }
}

class CloneSerializable extends Serializable {
    SERVICE = Object as any;
    getClone = jest.fn(() => ({ copied: true } as any));
}

describe('deepCopy', () => {
    it('returns primitives unchanged', () => {
        expect(deepCopy(5)).toBe(5);
        expect(deepCopy('x')).toBe('x');
        expect(deepCopy(null)).toBeNull();
    });

    it('deep clones arrays and nested objects', () => {
        const source = [{ a: 1 }, { b: [2, 3] }];
        const copy = deepCopy(source);

        expect(copy).toEqual(source);
        expect(copy).not.toBe(source);
        expect(copy[0]).not.toBe(source[0]);
        expect((copy[1] as any).b).not.toBe((source[1] as any).b);
    });

    it('clones Date instances by value', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const copy = deepCopy(date);

        expect(copy).not.toBe(date);
        expect(copy.getTime()).toBe(date.getTime());
    });

    it('preserves prototype and property descriptors', () => {
        const source = new ProtoObject(4);
        const copy = deepCopy(source);

        expect(copy).toBeInstanceOf(ProtoObject);
        expect(copy).not.toBe(source);
        expect(copy.doubled).toBe(8);
    });

    it('uses Serializable.getClone for Serializable instances', () => {
        const source = new CloneSerializable();
        const copy = deepCopy(source as any);

        expect(source.getClone).toHaveBeenCalledTimes(1);
        expect(copy).toEqual({ copied: true });
    });
});

describe('deepEqual', () => {
    it('returns true for identical primitives and false for different ones', () => {
        expect(deepEqual(1, 1)).toBe(true);
        expect(deepEqual(1, 2)).toBe(false);
    });

    it('compares arrays structurally', () => {
        expect(deepEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true);
        expect(deepEqual([1, 2], [2, 1])).toBe(false);
    });

    it('compares objects structurally', () => {
        expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
        expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('treats null/object and array/object mismatches as unequal', () => {
        expect(deepEqual(null, {})).toBe(false);
        expect(deepEqual([], {})).toBe(false);
    });
});

describe('deepMerge', () => {
    it('throws when less than two objects are provided', () => {
        expect(() => deepMerge({ a: 1 })).toThrow('deepMerge: this function expects at least 2 objects to be provided');
    });

    it('throws when any input is not an object', () => {
        expect(() => deepMerge({ a: 1 }, null as any)).toThrow('deepMerge: all values should be of type "object"');
    });

    it('concatenates arrays with same key', () => {
        const merged = deepMerge({ arr: [1, 2] }, { arr: [3] });
        expect(merged.arr).toEqual([1, 2, 3]);
    });

    it('deep merges nested objects and overwrites scalars', () => {
        const merged = deepMerge({ a: { x: 1 }, b: 1 }, { a: { y: 2 }, b: 3 }, { c: 4 });
        expect(merged).toEqual({ a: { x: 1, y: 2 }, b: 3, c: 4 });
    });
});
