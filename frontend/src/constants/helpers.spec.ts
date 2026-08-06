import { jsonSafe } from '@constants/object/jsonSafe';
import { short } from '@constants/short';
import { subPath } from '@constants/subPath';
import { objectMap, objectRemoveEmpty } from '@constants/object/objectMap';

describe('jsonSafe', () => {
    it('returns undefined for undefined input', () => {
        expect(jsonSafe(undefined)).toBeUndefined();
    });

    it('removes non-JSON values via JSON roundtrip', () => {
        const input = { a: 1, b: undefined, c: () => 'x' } as any;
        expect(jsonSafe(input)).toEqual({ a: 1 });
    });
});

describe('short', () => {
    it('formats small values with one decimal when below 10', () => {
        expect(short(1.24)).toBe('1.2');
        expect(short(9.95)).toBe('10');
    });

    it('formats thousands with K suffix', () => {
        expect(short(1200)).toBe('1.2K');
    });

    it('formats millions with M suffix', () => {
        expect(short(2500000)).toBe('2.5M');
    });

    it('formats billions with B suffix', () => {
        expect(short(3200000000)).toBe('3.2B');
    });

    it('formats trillions with T suffix', () => {
        expect(short(1200000000000)).toBe('1.2T');
    });

    it('preserves sign for negative values', () => {
        expect(short(-1500)).toBe('-1.5K');
    });
});

describe('subPath', () => {
    it('creates a route with parent, child and root flag', () => {
        class Parent {}
        class Child {}

        const route = subPath('demo', Parent as any, Child as any, true, 'Demo');
        expect(route.path).toBe('demo');
        expect(route.component).toBe(Parent);
        expect(route.children?.[0]).toEqual({ path: '', component: Child, title: 'Demo' });
        expect(route.data).toEqual({ isRoot: true });
    });
});

describe('objectMap', () => {
    it('maps object values while keeping keys and passing index', () => {
        const result = objectMap({ a: 1, b: 2 }, (value, key, i) => `${key}:${value + i}`);
        expect(result).toEqual({ a: 'a:1', b: 'b:3' });
    });
});

describe('objectRemoveEmpty', () => {
    it('removes null, undefined and empty arrays', () => {
        const result = objectRemoveEmpty({ a: null as any, b: undefined as any, c: [], d: [1], e: 'x' as any });
        expect(result).toEqual({ d: [1], e: 'x' });
    });

    it('keeps falsey scalar values that are valid data', () => {
        const result = objectRemoveEmpty({ a: 0 as any, b: false as any, c: '' as any });
        expect(result).toEqual({ a: 0, b: false, c: '' });
    });
});
