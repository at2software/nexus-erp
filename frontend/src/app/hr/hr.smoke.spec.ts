import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { HrEmploymentComponent } from '@app/hr/hr-employment/hr-employment.component';
import { HrMilestonesComponent } from '@app/hr/hr-milestones/hr-milestones.component';
import { HrStatsFocusCategoriesComponent } from '@app/hr/hr-stats/hr-stats-focus-categories/hr-stats-focus-categories.component';
import { HrStatsInvoiceFocusComponent } from '@app/hr/hr-stats/hr-stats-invoice-focus/hr-stats-invoice-focus.component';
import { HrStatsPredictionAccuracyComponent } from '@app/hr/hr-stats/hr-stats-prediction-accuracy/hr-stats-prediction-accuracy.component';
import { HrVacationColsComponent } from '@app/hr/hr-vacation/hr-vacation-cols.component';

const components: [string, Type<unknown>][] = [
    ['HrEmploymentComponent', HrEmploymentComponent],
    ['HrMilestonesComponent', HrMilestonesComponent],
    ['HrStatsFocusCategoriesComponent', HrStatsFocusCategoriesComponent],
    ['HrStatsInvoiceFocusComponent', HrStatsInvoiceFocusComponent],
    ['HrStatsPredictionAccuracyComponent', HrStatsPredictionAccuracyComponent],
    ['HrVacationColsComponent', HrVacationColsComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('hr renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
