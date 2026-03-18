import { Component, inject } from '@angular/core';
import { HeaderModule } from '@app/app/header/header.module';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NexusModule } from '@app/nx/nexus.module';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { InvoiceDetailGuard } from '../invoice-detail.guard';
import { SmartLinkDirective } from "@directives/smart-link.directive";

@Component({
    selector: 'invoice',
    templateUrl: './invoice.component.html',
    styleUrls: ['./invoice.component.scss'],
    standalone: true,
    imports: [HeaderModule, RouterModule, NexusModule, HotkeyDirective, NgbDropdownModule, SmartLinkDirective]
})
export class InvoiceComponent {
    parent = inject(InvoiceDetailGuard)
}
