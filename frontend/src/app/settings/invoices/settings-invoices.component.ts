import { GlobalService } from 'src/models/global.service';
import { Component, inject } from '@angular/core';
import { InvoiceItem } from 'src/models/invoice/invoice-item.model';
import { TabPlaceholderInfoComponent } from '../_shards/tab-placeholder-info/tab-placeholder-info.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { InputSettingsGroupComponent } from '@shards/input-group/input-group.component';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ToolbarLocaleSelectorComponent, LocaleKey } from '@shards/toolbar-locale-selector/toolbar-locale-selector.component';

@Component({
    selector: 'app-settings-invoices',
    templateUrl: './settings-invoices.component.html',
    styleUrls: ['./settings-invoices.component.scss'],
    standalone: true,
    imports: [TabPlaceholderInfoComponent, ScrollbarComponent, InputSettingsGroupComponent, TextParamEditorComponent, ToolbarComponent, ToolbarLocaleSelectorComponent]
})
export class SettingsInvoicesComponent {

    global = inject(GlobalService)

	tab: number = 0
	previewLocale: LocaleKey = 'de-formal'
	demoInvoices = [
	  InvoiceItem.fromJson({text: 'Testposition 1'}),
	  InvoiceItem.fromJson({text: 'Testposition 2'}),
	]

	currency = () => this.global.setting('invoiceCurrencySymbol')
	hours = () => this.global.setting('invoiceDefaultHourUnit')
	days = () => this.global.setting('invoiceDefaultDayUnit')
	percent = () => this.global.setting('invoiceDefaultPercentUnit')

	show = (_:number) => { this.tab = _ }

}
