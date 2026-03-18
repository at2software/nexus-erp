import { TemplateRef } from '@angular/core';
import { ToastService } from './toast.service';
export class Toast {
	static service: ToastService

    // classname: 'bg-green bg-gradient text-dark accent-success'
    // icon: material-icon
	static show(textOrTpl: string | TemplateRef<any>, options: any = { classname: 'bg-green bg-gradient text-dark accent-success' }) {
		Toast.service?.toasts.push({ textOrTpl, ...options });
	}
	static warn(textOrTpl: string | TemplateRef<any>) {
		Toast.show( textOrTpl, { classname: 'bg-warning bg-gradient text-dark', icon: 'warning' } );
	}
	static success(textOrTpl: string | TemplateRef<any>) {
		Toast.show( textOrTpl, { classname: 'bg-success bg-gradient text-dark', icon: 'check' } );
	}
	static error(textOrTpl: string | TemplateRef<any>) {
		Toast.show( textOrTpl, { classname: 'bg-danger bg-gradient text-white', icon: 'error' } );
	}
	static info(textOrTpl: string | TemplateRef<any>) {
		Toast.show( textOrTpl, { classname: 'bg-info bg-gradient text-dark', icon: 'info' } );
	}
}