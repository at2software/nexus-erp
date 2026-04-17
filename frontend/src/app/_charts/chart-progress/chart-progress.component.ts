import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ShortPipe } from 'src/pipes/short.pipe';

@Component({
    selector: 'chart-progress',
    templateUrl: './chart-progress.component.html',
    styleUrls: ['./chart-progress.component.scss'],
    host: { class: 'd-block w-100' },
    standalone: true,
    imports: [NgbTooltipModule, ShortPipe, CommonModule]
})
export class ChartProgressComponent {

  max    = input<number>(1)
  value  = input<number>(1)
  title  = input<string>('')
  suffix = input<string>('')
  scss   = input<string|undefined>(undefined)
  color  = input<string|undefined>(undefined)

}
