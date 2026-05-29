import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'environment404',
    templateUrl: './environment404.component.html',
    styleUrls: ['./environment404.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Environment404Component {
    reload = () => (document.location = '/dashboard');
}
