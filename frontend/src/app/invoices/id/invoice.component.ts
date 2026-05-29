import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { InvoiceDetailGuard } from '../invoice-detail.guard';
import { SmartLinkDirective } from '@directives/smart-link.directive';

@Component({
    selector: 'invoice',
    templateUrl: './invoice.component.html',
    styleUrls: ['./invoice.component.scss'],
    standalone: true,
    imports: [HeaderComponent, HeaderLinkItemComponent, RouterModule, HotkeyDirective, NgbDropdownModule, SmartLinkDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceComponent {
    parent = inject(InvoiceDetailGuard);

    readonly object = tracked(this.parent.object);
}
