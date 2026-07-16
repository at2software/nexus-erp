import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { TOptions } from './base.widget.component';

@Injectable({ providedIn: 'root' })
export class BaseWidgetListener {
    reloadRequested = new Subject<void>();
    updated = new Subject<[TOptions, number, number]>();
    deleted = new Subject<[unknown, number, number]>();
}
