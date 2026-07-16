import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WIDGET_SHARED } from '../widgets.shared';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-project-success',
    templateUrl: './widget-project-success.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED, PermissionsDirective],
})
export class WidgetProjectSuccessComponent extends BaseWidgetComponent {}
