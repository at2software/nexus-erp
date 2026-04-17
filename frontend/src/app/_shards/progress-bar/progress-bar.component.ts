import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
  style     = input<string>()
  overStyle = input<string>('danger')
  progress  = input.required<number>()
  height    = input<number>(2)
  perc = () => { const p = this.progress(); return { width: ((p > 1 ? p - 1 : p) * 100) + '%' } }
  background = () => this.progress() > 1 ? 'bg-' + this.style() : ''
  foreground = () => 'bg-' + (this.progress() > 1 ? this.overStyle() : this.style())
}
