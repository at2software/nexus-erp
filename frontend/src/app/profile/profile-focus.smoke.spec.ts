import { renderComponent } from '@testing/component-test';
import { User } from '@models/user/user.model';
import { ProfileFocusComponent } from '@app/profile/profile-focus/profile-focus.component';

// The component reads `global.user` at field-initializer time -- in the app that is filled in
// by the login response before any route renders.
describe('profile focus renders', () => {
    it('ProfileFocusComponent', () => {
        const fixture = renderComponent(ProfileFocusComponent, {
            global: { user: User.fromJson({ id: '1', name: 'Thomas' }) },
            tables: { users: ['name'] },
        });
        expect(fixture.nativeElement).toBeTruthy();
    });
});
