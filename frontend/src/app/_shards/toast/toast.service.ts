import { Toast, ToastItem, ToastOptions } from './toast';
import { Injectable, TemplateRef, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
    readonly toasts = signal<ToastItem[]>([]);

    constructor() {
        Toast.service = this;
    }

    show(textOrTpl: string | TemplateRef<unknown>, options: ToastOptions = {}) {
        this.toasts.update((toasts) => [...toasts, { textOrTpl, ...Object.assign({ classname: 'bg-dark text-light', icon: 'check' }, options) }]);
    }

    remove(toast: ToastItem) {
        this.toasts.update((toasts) => toasts.filter((t) => t !== toast));
    }
}
