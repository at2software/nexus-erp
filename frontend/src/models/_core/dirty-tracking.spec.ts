import { changedFields } from '@models/_core/dirty-tracking';

describe('changedFields', () => {
    it('reports nothing when the payload matches the baseline', () => {
        expect(changedFields({ a: 1, b: 'x' }, JSON.stringify({ a: 1, b: 'x' }))).toEqual({});
    });

    it('reports only the fields that differ', () => {
        expect(changedFields({ a: 1, b: 'x' }, JSON.stringify({ a: 1, b: 'y' }))).toEqual({ b: 'x' });
    });

    it('compares nested structures by value, not identity', () => {
        expect(changedFields({ a: { n: [1, 2] } }, JSON.stringify({ a: { n: [1, 2] } }))).toEqual({});
        expect(changedFields({ a: { n: [1, 3] } }, JSON.stringify({ a: { n: [1, 2] } }))).toEqual({ a: { n: [1, 3] } });
    });

    it('reports a field the baseline never had', () => {
        expect(changedFields({ a: 1 }, JSON.stringify({}))).toEqual({ a: 1 });
    });

    it('ignores baseline keys the payload no longer carries', () => {
        expect(changedFields({ a: 1 }, JSON.stringify({ a: 1, gone: 'x' }))).toEqual({});
    });

    it('treats an unset baseline as empty rather than throwing', () => {
        expect(changedFields({ a: 1 }, undefined)).toEqual({ a: 1 });
    });

    it('distinguishes null from a missing baseline value', () => {
        expect(changedFields({ a: null }, JSON.stringify({ a: null }))).toEqual({});
        expect(changedFields({ a: null }, JSON.stringify({ a: 0 }))).toEqual({ a: null });
    });
});
