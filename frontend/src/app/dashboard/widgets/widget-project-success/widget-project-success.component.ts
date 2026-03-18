import { Component } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { WidgetsModule } from '../widgets.module';
import { PermissionsDirective } from '@directives/permissions.directive';

@Component({
    selector: 'widget-project-success',
    templateUrl: './widget-project-success.component.html',
    styleUrls: ['./widget-project-success.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, PermissionsDirective]
})
export class WidgetProjectSuccessComponent extends BaseWidgetComponent {
}
