import { Component, TemplateRef } from '@angular/core';
import { ToastService } from './toast.service';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'app-toasts',
    templateUrl: 'toast.container.html',
    styles: [':host{top:auto !important; position: fixed !important; z-index:2000; bottom:10px; right:10px;} ::ng-deep .toast-body{padding:.25rem !important;}'],
    host: { class: 'align-items-end', '[class.ngb-toasts]': 'true' },
    standalone: true,
    imports: [NgbToastModule, CommonModule, SafePipe]
})
export class ToastsContainer {
    constructor(public toastService: ToastService) { }
    isTemplate(toast: any) { return toast.textOrTpl instanceof TemplateRef; }
}