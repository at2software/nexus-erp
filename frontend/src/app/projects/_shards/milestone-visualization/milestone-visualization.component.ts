import { Component, Input } from '@angular/core';
import { Nx } from '@app/nx/nx.directive';
import { Milestone } from 'src/models/milestone.model';

@Component({
    selector: 'milestone',
    templateUrl: './milestone-visualization.component.html',
    styleUrls: ['./milestone-visualization.component.scss'],
    standalone: true,
    imports: [Nx]
})
export class MilestoneVisualizationComponent {
  @Input() milestone:Milestone
  // https://medium.com/ngconf/using-leader-line-to-draw-lines-between-two-angular-components-71a7c316a163
}
