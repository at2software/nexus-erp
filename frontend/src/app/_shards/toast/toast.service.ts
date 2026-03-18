import { Toast } from './toast';
import { Injectable, TemplateRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {

  toasts: any[] = [];

  constructor() {
    Toast.service = this
  }

  show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    this.toasts.push({ textOrTpl, ...Object.assign({ classname: 'bg-dark text-light', icon: 'check' }, options) });
  }

  remove(toast:any) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }
}