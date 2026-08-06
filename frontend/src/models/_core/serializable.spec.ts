import { NxStatic } from '@app/nx/nx.static';
import type { GlobalService } from '@models/global.service';
import type { TableColumnDto, TableSchemaDto } from '@models/_core/api-response';
import { Serializable } from '@models/_core/serializable';
import { Vacation } from '@models/vacation/vacation.model';

const table = (name: string, ...fields: string[]): TableSchemaDto => ({
    name,
    columns: fields.map((Field) => ({ Field }) as TableColumnDto),
});

// `toPayload()` runs on every deserialize (to capture the dirty-tracking baseline) and asks
// NxStatic for the backend column list, which the running app fills in from /environment.
beforeAll(() => {
    NxStatic.global = {
        tables: [table('vacations', 'comment', 'amount', 'state'), table('vacation_grants', 'amount')],
    } as GlobalService;
});

describe('Serializable', () => {
    it('is defined by the time a subclass evaluates its extends clause', () => {
        expect(Object.getPrototypeOf(Vacation)).toBe(Serializable);
    });

    it('deserializes scalars and nested models', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer', amount: 5, grant: { id: '3', amount: 30 } });

        expect(v).toBeInstanceOf(Vacation);
        expect(v.id).toBe('7');
        expect(v.comment).toBe('summer');
        expect(v.grant).toBeInstanceOf(Serializable);
        expect(v.grant.id).toBe('3');
    });

    it('builds a payload from the known columns only', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer', amount: 5 });
        expect(v.toPayload()).toEqual({ comment: 'summer', amount: 5, state: 0 });
    });

    it('starts clean and reports only the fields that changed', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer', amount: 5 });
        expect(v.isDirty()).toBe(false);

        v.patch({ comment: 'winter' });
        expect(v.isDirty()).toBe(true);
        expect(v.dirtyFields()).toEqual({ comment: 'winter' });
    });

    it('clones deeply, without sharing nested references', () => {
        const v = Vacation.fromJson({ id: '7', var: { tags: ['a'] } });
        const clone = v.getClone<Vacation>();

        expect(clone).toBeInstanceOf(Vacation);
        expect(clone.var['tags']).toEqual(['a']);
        expect(clone.var['tags']).not.toBe(v.var['tags']);
    });

    it('gives every instance its own track id', () => {
        const a = Vacation.fromJson({ id: '1' });
        const b = Vacation.fromJson({ id: '2' });
        expect(a.track_id).not.toBe(b.track_id);
    });

    // store() resolves to the instance it was called on, so callers that append
    // `Model.fromJson(response)` hydrate a model from a live model rather than from JSON.
    it('gives every instance its own track id when hydrated from another instance', () => {
        const source = Vacation.fromJson({ id: '1' });
        const a = Vacation.fromJson(source);
        const b = Vacation.fromJson(source);

        expect(a.track_id).not.toBe(source.track_id);
        expect(a.track_id).not.toBe(b.track_id);
    });

    it('does not alias var when hydrated from another instance', () => {
        const source = Vacation.fromJson({ id: '1', var: { tags: ['a'] } });
        const a = Vacation.fromJson(source);
        const b = Vacation.fromJson(source);

        a.var['pos'] = 1;
        b.var['pos'] = 2;

        expect(a.var).not.toBe(source.var);
        expect(a.var['pos']).toBe(1);
        expect(a.var['tags']).toEqual(['a']);
        expect(a.var['tags']).not.toBe(source.var['tags']);
    });
});
