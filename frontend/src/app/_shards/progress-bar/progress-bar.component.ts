import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Progress bar that allows percentages over 100%
 */
@Component({
    selector: 'progress-bar',
    templateUrl: './progress-bar.component.html',
    styleUrls: ['./progress-bar.component.scss'],
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent {
  @Input() style:string
  @Input() overStyle:string = 'danger'
  @Input() progress:number
  perc = ():any => ({width: ((this.progress <= 1 ? this.progress : this.progress - 1) * 100) + '%'})
  background = () => this.progress > 1 ? 'bg-' + this.style : ''
  foreground = () => this.progress > 1 ? 'bg-' + this.overStyle : 'bg-' + this.style
}
