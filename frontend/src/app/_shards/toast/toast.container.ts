import { ChangeDetectionStrategy, Component, inject, TemplateRef } from '@angular/core';
import { ToastService } from './toast.service';
import { ToastItem } from './toast';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { NgTemplateOutlet } from '@angular/common';
import { SafePipe } from '@pipes/safe.pipe';

@Component({
    selector: 'app-toasts',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: 'toast.container.html',
    styles: [':host{top:auto !important; position: fixed !important; z-index:2000; bottom:10px; right:10px;} ::ng-deep .toast-body{padding:.25rem !important;}'],
    host: { class: 'align-items-end', '[class.ngb-toasts]': 'true' },
    imports: [NgbToastModule, NgTemplateOutlet, SafePipe],
})
export class ToastsContainer {
    readonly toastService = inject(ToastService);

    asTemplate(toast: ToastItem): TemplateRef<unknown> | null {
        return toast.textOrTpl instanceof TemplateRef ? toast.textOrTpl : null;
    }

    asText(toast: ToastItem): string {
        return toast.textOrTpl instanceof TemplateRef ? '' : toast.textOrTpl;
    }
}
