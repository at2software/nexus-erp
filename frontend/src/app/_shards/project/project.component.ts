
import { Component, HostBinding, input } from '@angular/core';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { Project } from 'src/models/project/project.model';

@Component({
    selector: 'project',
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.scss'],
    imports: [NgbTooltip, SmartLinkDirective],
    standalone: true
})
export class ProjectComponent {
    project   = input.required<Project>()
    title     = input<string>()
    click     = input<()=>void>()
    noRouting = input<boolean>(false)
    @HostBinding('class.is-internal') get isInternal () { return this.project().is_internal }
    tooltip = () => this.title() ? this.title() : this.project().name + ' (' + Math.round(100 * this.project().progress) + '%)'
}
