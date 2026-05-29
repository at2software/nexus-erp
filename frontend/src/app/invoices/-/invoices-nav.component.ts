import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActionsInvoiceLatest } from '@app/invoices/_shards/actions-invoice-latest/actions-invoice-latest';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'invoices-nav',
    templateUrl: './invoices-nav.component.html',
    styleUrls: ['./invoices-nav.component.scss'],
    standalone: true,
    imports: [RouterModule, ActivityTabComponent, ActionsInvoiceLatest, HeaderComponent, HeaderLinkItemComponent, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesNavComponent {}
