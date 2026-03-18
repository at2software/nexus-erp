import { Component } from '@angular/core';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ToolbarLocaleSelectorComponent, LocaleKey } from '@shards/toolbar-locale-selector/toolbar-locale-selector.component';

@Component({
    selector: 'settings-projects-quote',
    templateUrl: './settings-projects-quote.component.html',
    styleUrls: ['./settings-projects-quote.component.scss'],
    standalone: true,
    imports: [TextParamEditorComponent, ToolbarComponent, ToolbarLocaleSelectorComponent]
})
export class SettingsProjectsQuoteComponent {
    previewLocale: LocaleKey = 'de-formal'
}
