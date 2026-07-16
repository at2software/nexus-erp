import { of } from 'rxjs';
import { Dictionary } from '@constants/constants';
import { mapVar, pluck, serialize } from '@constants/rxjs-operators';
import type { Serializable } from '@models/serializable';

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
    it('mapVar adds default _self mapping', (done) => {
        of({} as TestResponse).pipe(mapVar(['a', 'b'])).subscribe((value) => {
            expect(value._varMappings!['_self']).toEqual(['a', 'b']);
            done();
        });
    });

    it('mapVar stores mapping for explicit sub key', (done) => {
        of({} as TestResponse).pipe(mapVar(['x'], 'users')).subscribe((value) => {
            expect(value._varMappings!['users']).toEqual(['x']);
            done();
        });
    });

    it('serialize reads snake_case key when camelCase is missing', (done) => {
        of({ team_users: [{ id: '1', name: 'Alpha' }] } as TestResponse).pipe(serialize('teamUsers', testModelSerializer)).subscribe((value) => {
            const [teamUser] = value.teamUsers ?? [];
            expect(value.teamUsers).toHaveLength(1);
            expect(teamUser).toBeInstanceOf(TestModel);
            expect((teamUser as TestModel | undefined)?.name).toBe('Alpha');
            done();
        });
    });

    it('serialize reads camelCase key as fallback', (done) => {
        of({ teamUsers: [{ id: '2', name: 'Beta' }] } as TestResponse).pipe(serialize('teamUsers', testModelSerializer)).subscribe((value) => {
            const [teamUser] = value.teamUsers ?? [];
            expect(value.teamUsers).toHaveLength(1);
            expect((teamUser as TestModel | undefined)?.name).toBe('Beta');
            done();
        });
    });

    it('serialize maps configured var fields onto model.var', (done) => {
        of({ users: [{ id: '3', name: 'Gamma', score: 10 }], _varMappings: { users: ['score'] } } as TestResponse)
            .pipe(serialize('users', testModelSerializer))
            .subscribe((value) => {
                const [user] = value.users ?? [];
                expect((user as TestModel | undefined)?.var['score']).toBe(10);
                done();
            });
    });

    it('serialize skips undefined var fields', (done) => {
        of({ users: [{ id: '4', name: 'Delta' }], _varMappings: { users: ['score'] } } as TestResponse)
            .pipe(serialize('users', testModelSerializer))
            .subscribe((value) => {
                const [user] = value.users ?? [];
                expect((user as TestModel | undefined)?.var['score']).toBeUndefined();
                done();
            });
    });

    it('serialize returns empty array when key is missing', (done) => {
        of({} as TestResponse).pipe(serialize('users', testModelSerializer)).subscribe((value) => {
            expect(value.users).toEqual([]);
            done();
        });
    });

    it('pluck prefers camelCase then snake_case then empty array', (done) => {
        of({ camelKey: [1], snake_key: [2] }).pipe(pluck('camelKey')).subscribe((value) => {
            expect(value).toEqual([1]);
        });
        of({ snake_key: [2] }).pipe(pluck('snakeKey')).subscribe((value) => {
            expect(value).toEqual([2]);
        });
        of({}).pipe(pluck('missingKey')).subscribe((value) => {
            expect(value).toEqual([]);
            done();
        });
    });
});
