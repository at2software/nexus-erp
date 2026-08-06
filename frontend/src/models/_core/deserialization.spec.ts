import { NxStatic } from '@app/nx/nx.static';
import type { GlobalService } from '@models/global.service';
import { Assignee } from '@models/assignee/assignee.model';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { Serializable } from '@models/_core/serializable';
import { User } from '@models/user/user.model';
import { Vacation } from '@models/vacation/vacation.model';
import { environment } from '@environments/environment';

/**
 * Pins the behaviour of `fromJson` so the deserializer can be swapped underneath it. Every
 * case here is something a model or a template relies on, not a property of the library that
 * happens to provide it.
 */
beforeAll(() => {
    NxStatic.global = { tables: [], project_states: [] } as unknown as GlobalService;
});

describe('fromJson', () => {
    it('builds the declared class and keeps field defaults for absent keys', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer' });

        expect(v).toBeInstanceOf(Vacation);
        expect(v.comment).toBe('summer');
        expect(v.amount).toBe(0);
        expect(v.log).toBe('');
    });

    it('constructs a single nested relation as its model', () => {
        const v = Vacation.fromJson({ id: '7', grant: { id: '3', amount: 30 } });

        expect(v.grant).toBeInstanceOf(Serializable);
        expect(v.grant.id).toBe('3');
        expect(v.grant.amount).toBe(30);
    });

    it('constructs an array relation element-wise', () => {
        const c = Company.fromJson({ id: '1', employees: [{ id: '2' }, { id: '3' }] });

        expect(c.employees).toHaveLength(2);
        expect(c.employees[0]).toBeInstanceOf(CompanyContact);
        expect(c.employees.map((e) => e.id)).toEqual(['2', '3']);
    });

    it('leaves an absent relation undefined rather than inventing an empty model', () => {
        const v = Vacation.fromJson({ id: '7' });
        expect(v.grant).toBeUndefined();
    });

    it('resolves a polymorphic relation through the class discriminator', () => {
        const a = Assignee.fromJson({ id: '1', assignee: { id: '9', class: 'User', name: 'Thomas' } });

        expect(a.assignee).toBeInstanceOf(User);
        // keepDiscriminatorProperty: the `class` field survives onto the instance.
        expect(a.assignee.class).toBe('User');
    });

    it('picks a different subtype for the same field from the same payload shape', () => {
        const a = Assignee.fromJson({ id: '1', assignee: { id: '9', class: 'CompanyContact' } });
        expect(a.assignee).toBeInstanceOf(CompanyContact);
    });

    it('runs field setters, which some models use to derive state', () => {
        // Focus.user has a setter that normalises whatever it is handed into a User.
        const f = Company.fromJson({ id: '1', name: 'ACME' });
        expect(f.getName()).toBe('ACME');
    });

    it('does not overwrite the excluded httpService with payload data', () => {
        const v = Vacation.fromJson({ id: '7', httpService: 'nonsense' });
        expect(typeof v.httpService).not.toBe('string');
    });

    it('applies a custom transform', () => {
        const c = Company.fromJson({ id: '1', source: { id: '5', class: 'User' } });
        expect(c.source === undefined || c.source instanceof Serializable).toBe(true);
    });

    it('hydrates an existing instance in place, preserving identity', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer' });
        const same = v.fromJson({ id: '7', comment: 'winter' });

        expect(same).toBe(v);
        expect(v.comment).toBe('winter');
    });

    it('captures a dirty-tracking baseline so a fresh model is clean', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer' });
        expect(v.isDirty()).toBe(false);
    });

    it('exposes the raw payload through snapshot()', () => {
        const v = Vacation.fromJson({ id: '7', comment: 'summer' });
        expect(v.snapshot().comment).toBe('summer');
    });

    // Ids are copied verbatim: coercing `id` alone would split it from the `*_id` foreign
    // keys and break every `a.id === b.a_id` comparison. See the note in hydrate.ts.
    it('copies ids without changing their type', () => {
        const v = Vacation.fromJson({ id: 2243, vacation_grant_id: 9 });

        expect(v.id).toBe(2243);
        expect(v.vacation_grant_id).toBe(9);
    });

    it('skips a field overridden with a getter and no setter', () => {
        // CompanyContact.gender derives from its contact, so assigning it would throw and
        // abort the whole payload.
        const c = CompanyContact.fromJson({ id: '1', gender: 'f', company_id: '5' });

        expect(c.id).toBe('1');
        expect(c.company_id).toBe('5');
    });

    it('never replaces a signal-valued field with payload data', () => {
        const v = Vacation.fromJson({ id: '1', getBadge: ['a', 'b'], getName: 'nope' });

        expect(typeof v.getBadge).toBe('function');
        expect(typeof v.getName).toBe('function');
    });

    it('resolves a relative payload icon against the api url', () => {
        const v = Vacation.fromJson({ id: '1', icon: 'users/5/icon' });

        expect(v.getAvatar()).toBe(environment.envApi + 'users/5/icon');
    });

    // envApi is root-relative in production ('/backend/api/'), so a url a plugin fed back in
    // would be prefixed a second time without this.
    it('leaves an already resolved icon url untouched', () => {
        expect(Vacation.fromJson({ id: '1', icon: 'https://git.at2.me/avatar.png' }).getAvatar()).toBe('https://git.at2.me/avatar.png');
        expect(Vacation.fromJson({ id: '1', icon: '/backend/api/users/5/icon' }).getAvatar()).toBe('/backend/api/users/5/icon');
    });

    it('gives every instance its own track id', () => {
        expect(Vacation.fromJson({ id: '1' }).track_id).not.toBe(Vacation.fromJson({ id: '2' }).track_id);
    });
});
