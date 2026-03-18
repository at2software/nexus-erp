import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { InvoiceItem } from 'src/models/invoice/invoice-item.model';
import { TabPlaceholderInfoComponent } from '../_shards/tab-placeholder-info/tab-placeholder-info.component';

@Component({
    selector: 'app-settings-projects',
    templateUrl: './settings-projects.component.html',
    styleUrls: ['./settings-projects.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, RouterModule, TabPlaceholderInfoComponent]
})
export class SettingsProjectsComponent {

  demoInvoices = [
    InvoiceItem.fromJson({text: 'Testposition 1'}),
    InvoiceItem.fromJson({text: 'Testposition 2'}),
  ]

}
