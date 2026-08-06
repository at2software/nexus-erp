import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'progress-bar',
    templateUrl: './progress-bar.component.html',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
    style = input<string>();
    overStyle = input<string>('danger');
    progress = input.required<number>();
    height = input<number>(2);
    perc = () => {
        const p = this.progress();
        return (p > 1 ? p - 1 : p) * 100;
    };
    background = () => (this.progress() > 1 ? 'bg-' + this.style() : '');
    foreground = () => 'bg-' + (this.progress() > 1 ? this.overStyle() : this.style());
}
