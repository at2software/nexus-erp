import { ActivityTabComponent } from '@activity/activity-tab.component';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActionsInvoiceLatest } from '@app/invoices/_shards/actions-invoice-latest/actions-invoice-latest';
import { HeaderModule } from '@app/app/header/header.module';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'invoices-nav',
    templateUrl: './invoices-nav.component.html',
    styleUrls: ['./invoices-nav.component.scss'],
    standalone: true,
    imports: [RouterModule, ActivityTabComponent, ActionsInvoiceLatest, HeaderModule, HotkeyDirective]
})
export class InvoicesNavComponent {

}
