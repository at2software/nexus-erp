import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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

  @Input() max:number = 1
  @Input() value:number = 1
  @Input() title:string = ''
  @Input() suffix:string = ''
  @Input() scss:string|undefined = undefined
  @Input() color:string|undefined = undefined

}
