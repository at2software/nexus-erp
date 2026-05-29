import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BaseWidgetListener {
    updated = new Subject<[any, number, number]>();
    deleted = new Subject<[any, number, number]>();
}
