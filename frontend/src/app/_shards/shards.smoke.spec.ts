import type { Type } from '@angular/core';
import { renderComponent } from '@testing/component-test';
import { ConnectionsListComponent } from '@app/_shards/connections-list/connections-list.component';
import { IssuePickerComponent } from '@app/_shards/issue-picker/issue-picker.component';
import { PaymentPlanEditorComponent } from '@app/_shards/payment-plan-editor/payment-plan-editor.component';
import { PaymentPlanTiersEditorComponent } from '@app/_shards/payment-plan-editor/payment-plan-tiers-editor.component';
import { TextParamEditorComponent } from '@app/_shards/text-param-editor/text-param-editor.component';

const components: [string, Type<unknown>][] = [
    ['ConnectionsListComponent', ConnectionsListComponent],
    ['IssuePickerComponent', IssuePickerComponent],
    ['PaymentPlanEditorComponent', PaymentPlanEditorComponent],
    ['PaymentPlanTiersEditorComponent', PaymentPlanTiersEditorComponent],
    ['TextParamEditorComponent', TextParamEditorComponent],
];

// Every component here loads through the Resource API. Nothing resolves under the testing
// HTTP backend, so this asserts only that the loading state renders without throwing.
describe('shards renders', () => {
    it.each(components)('%s', (_name, component) => {
        expect(renderComponent(component).nativeElement).toBeTruthy();
    });
});
