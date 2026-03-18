import { Component } from '@angular/core';

@Component({
    selector: 'environment404',
    templateUrl: './environment404.component.html',
    styleUrls: ['./environment404.component.scss'],
    standalone: true
})
export class Environment404Component {
    reload = () => document.location = '/dashboard'
}
