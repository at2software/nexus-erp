import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { ProfileMilestonesComponent } from '@app/profile/profile-milestones/profile-milestones.component';
import { ProfileSentinelDetailComponent } from '@app/profile/profile-sentinels/profile-sentinel-detail/profile-sentinel-detail.component';
import { ProfileSentinelsComponent } from '@app/profile/profile-sentinels/profile-sentinels.component';
import { ProfileVacationRequestComponent } from '@app/profile/profile-vacation-request/profile-vacation-request.component';
import { ProfileVacationWidgetComponent } from '@app/profile/widgets/profile-vacation-widget/profile-vacation-widget.component';

const components: [string, Type<unknown>][] = [
    ['ProfileMilestonesComponent', ProfileMilestonesComponent],
    ['ProfileSentinelDetailComponent', ProfileSentinelDetailComponent],
    ['ProfileSentinelsComponent', ProfileSentinelsComponent],
    ['ProfileVacationRequestComponent', ProfileVacationRequestComponent],
    ['ProfileVacationWidgetComponent', ProfileVacationWidgetComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('profile renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
