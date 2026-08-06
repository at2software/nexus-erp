import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { InputSettingsGroupComponent } from '@shards/input-group/input-settings-group.component';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ToolbarLocaleSelectorComponent, LocaleKey } from '@shards/toolbar-locale-selector/toolbar-locale-selector.component';

@Component({
    selector: 'settings-projects-quote',
    templateUrl: './settings-projects-quote.component.html',
    imports: [InputSettingsGroupComponent, TextParamEditorComponent, ToolbarComponent, ToolbarLocaleSelectorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsQuoteComponent {
    previewLocale = signal<LocaleKey>('de-formal');

    #global = inject(GlobalService);

    readonly days = computed(() => this.#global.setting('invoiceDefaultDayUnit'));
}
