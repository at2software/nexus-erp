import { Component, inject } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { Injectable } from '@angular/core';

@Component({
    selector: 'modal-uptime-monitor',
    templateUrl: './modal-uptime-monitor.component.html',
    styleUrls: ['./modal-uptime-monitor.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule]
})
export class ModalUptimeMonitorComponent {
    monitor!: UptimeMonitor;
    isCreating: boolean = false;
    isSaving: boolean = false;
    projectIds: string[] = [];

    activeModal = inject(NgbActiveModal);
    #service = inject(UptimeMonitorService);

    isValid(): boolean {
        return !!(this.monitor.name?.trim() && this.monitor.url?.trim());
    }

    save() {
        if (!this.isValid()) {
            alert('Please fill in all required fields (Name and URL)');
            return;
        }

        // Extract only the necessary fields for the API
        const payload: any = {
            name: this.monitor.name,
            url: this.monitor.url,
            method: this.monitor.method,
            expected_status_code: this.monitor.expected_status_code,
            timeout: this.monitor.timeout,
            response_time_threshold: this.monitor.response_time_threshold,
            check_interval: this.monitor.check_interval,
            is_active: this.monitor.is_active,
            request_headers: this.monitor.request_headers,
            request_body: this.monitor.request_body
        };

        // Include project IDs if creating from a project context
        if (this.isCreating && this.projectIds.length > 0) {
            payload.project_ids = this.projectIds;
        }

        this.isSaving = true;
        const action = this.isCreating
            ? this.#service.store(payload)
            : this.#service.update(this.monitor.id, payload);
        action.subscribe({
            next: (result) => {
                this.isSaving = false;
                if (Array.isArray(result) && result.length === 0) {
                    alert('Failed to save monitor: Server returned empty response.');
                    return;
                }
                this.activeModal.close(true);
            },
            error: (err) => {
                this.isSaving = false;
                alert(`Failed to save monitor: ${err?.error?.message || err?.message || 'Unknown error'}`);
            }
        });
    }

    close() {
        this.activeModal.dismiss();
    }
}

@Injectable({ providedIn: 'root' })
export class UptimeMonitorModalService {
    modalService = inject(NgbModal);

    open(monitor?: UptimeMonitor, projectIds?: string[]): Promise<boolean> {
        const modalRef = this.modalService.open(ModalUptimeMonitorComponent, { size: 'lg' });

        if (monitor) {
            modalRef.componentInstance.monitor = Object.assign(new UptimeMonitor(), monitor);
            modalRef.componentInstance.isCreating = false;
        } else {
            const newMonitor = new UptimeMonitor();
            newMonitor.method = 'GET';
            newMonitor.expected_status_code = 200;
            newMonitor.timeout = 30;
            newMonitor.response_time_threshold = 5000;
            newMonitor.check_interval = 300;
            newMonitor.is_active = true;
            modalRef.componentInstance.monitor = newMonitor;
            modalRef.componentInstance.isCreating = true;
            modalRef.componentInstance.projectIds = projectIds || [];
        }

        return modalRef.result;
    }
}
