import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'empty-component',
    imports: [RouterModule],
    templateUrl: './empty-component.component.html',
})
export class EmptyComponentComponent {}
