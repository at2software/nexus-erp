import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { GlobalService } from '@models/global.service';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SmartLinkDirective, NgbDropdownModule, NgbTooltipModule],
    selector: 'parent-project-selector',
    templateUrl: './parent-project-selector.component.html',
})
export class ParentProjectSelectorComponent {
    parent = inject(ProjectDetailGuard);
    global = inject(GlobalService);
}
