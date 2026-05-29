import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'file',
    templateUrl: './file.component.html',
    styleUrls: ['./file.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileComponent {
    color = input<string | undefined>();
    size = input<number | undefined>();
    getWidth = () => (this.size() ? this.size()! * 0.75 : 0);
}
