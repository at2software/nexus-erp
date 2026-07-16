import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ToolbarLocaleSelectorComponent, LocaleKey } from '@shards/toolbar-locale-selector/toolbar-locale-selector.component';

@Component({
    selector: 'settings-projects-quote',
    templateUrl: './settings-projects-quote.component.html',
    imports: [TextParamEditorComponent, ToolbarComponent, ToolbarLocaleSelectorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsQuoteComponent {
    previewLocale = signal<LocaleKey>('de-formal');
}
