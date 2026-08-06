import { firstValueFrom, of } from 'rxjs';
import { Dictionary } from '@constants/constants';
import { mapVar, pluck, serialize } from '@constants/rxjs/rxjs-operators';
import type { Serializable } from '@models/_core/serializable';

type TestResponse = Dictionary & {
    _varMappings?: Dictionary<string[]>;
    team_users?: Dictionary[];
    teamUsers?: (Dictionary | TestModel)[];
    users?: (Dictionary | TestModel)[];
};

class TestModel {
    id = '';
    name = '';
    var: Dictionary<unknown> = {};

    static fromJson(raw: Dictionary): TestModel {
        const model = new TestModel();
        model.id = raw['id'] as string;
        model.name = raw['name'] as string;
        return model;
    }
}

const testModelSerializer = TestModel as unknown as (new () => Serializable) & {
    fromJson(json: Dictionary): Serializable;
};

describe('rxjs-operators', () => {
    it('mapVar adds default _self mapping', async () => {
        const value = await firstValueFrom(of({} as TestResponse).pipe(mapVar(['a', 'b'])));
        expect(value._varMappings!['_self']).toEqual(['a', 'b']);
    });

    it('mapVar stores mapping for explicit sub key', async () => {
        const value = await firstValueFrom(of({} as TestResponse).pipe(mapVar(['x'], 'users')));
        expect(value._varMappings!['users']).toEqual(['x']);
    });

    it('serialize reads snake_case key when camelCase is missing', async () => {
        const value = await firstValueFrom(of({ team_users: [{ id: '1', name: 'Alpha' }] } as TestResponse).pipe(serialize('teamUsers', testModelSerializer)));
        const [teamUser] = value.teamUsers ?? [];
        expect(value.teamUsers).toHaveLength(1);
        expect(teamUser).toBeInstanceOf(TestModel);
        expect((teamUser as TestModel | undefined)?.name).toBe('Alpha');
    });

    it('serialize reads camelCase key as fallback', async () => {
        const value = await firstValueFrom(of({ teamUsers: [{ id: '2', name: 'Beta' }] } as TestResponse).pipe(serialize('teamUsers', testModelSerializer)));
        const [teamUser] = value.teamUsers ?? [];
        expect(value.teamUsers).toHaveLength(1);
        expect((teamUser as TestModel | undefined)?.name).toBe('Beta');
    });

    it('serialize maps configured var fields onto model.var', async () => {
        const value = await firstValueFrom(
            of({ users: [{ id: '3', name: 'Gamma', score: 10 }], _varMappings: { users: ['score'] } } as TestResponse).pipe(serialize('users', testModelSerializer)),
        );
        const [user] = value.users ?? [];
        expect((user as TestModel | undefined)?.var['score']).toBe(10);
    });

    it('serialize skips undefined var fields', async () => {
        const value = await firstValueFrom(
            of({ users: [{ id: '4', name: 'Delta' }], _varMappings: { users: ['score'] } } as TestResponse).pipe(serialize('users', testModelSerializer)),
        );
        const [user] = value.users ?? [];
        expect((user as TestModel | undefined)?.var['score']).toBeUndefined();
    });

    it('serialize returns empty array when key is missing', async () => {
        const value = await firstValueFrom(of({} as TestResponse).pipe(serialize('users', testModelSerializer)));
        expect(value.users).toEqual([]);
    });

    it('pluck prefers camelCase then snake_case then empty array', async () => {
        expect(await firstValueFrom(of({ camelKey: [1], snake_key: [2] }).pipe(pluck('camelKey')))).toEqual([1]);
        expect(await firstValueFrom(of({ snake_key: [2] }).pipe(pluck('snakeKey')))).toEqual([2]);
        expect(await firstValueFrom(of({}).pipe(pluck('missingKey')))).toEqual([]);
    });
});
