import { Component, computed, model } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

export type LocaleKey = 'de-formal' | 'de-informal' | 'en-formal' | 'en-informal';

@Component({
    selector: 'toolbar-locale-selector',
    standalone: true,
    imports: [FormsModule, NgbDropdownModule],
    template: `
        <div ngbDropdown class="d-inline-block">
            <button type="button" class="btn btn-primary dropdown-toggle-simple" ngbDropdownToggle>
                <i class="me-1">translate</i>
                <span>{{currentLabel()}}</span>
            </button>
            <div ngbDropdownMenu>
                @for (option of localeOptions; track option.key) {
                <button type="button" ngbDropdownItem
                        [class.active]="option.key === locale()"
                        (click)="locale.set(option.key)">
                    {{option.label}}
                </button>
                }
            </div>
        </div>
    `
})
export class ToolbarLocaleSelectorComponent {
    locale = model<LocaleKey>('de-formal');

    localeOptions: { key: LocaleKey; label: string }[] = [
        { key: 'de-formal', label: 'DE - formal' },
        { key: 'de-informal', label: 'DE - informal' },
        { key: 'en-formal', label: 'EN - formal' },
        { key: 'en-informal', label: 'EN - informal' },
    ];

    currentLabel = computed(() => this.localeOptions.find(o => o.key === this.locale())?.label || 'DE - formal');
}
