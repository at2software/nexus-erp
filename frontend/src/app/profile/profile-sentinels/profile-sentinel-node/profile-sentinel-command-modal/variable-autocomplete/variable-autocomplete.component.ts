import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SentinelOptionField } from '@app/profile/profile-sentinels/sentinel-condition-option-field.model';
import { GlobalService } from '@models/global.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

interface Suggestion { name: string; type: string }

@Component({
    selector: 'variable-autocomplete',
    templateUrl: './variable-autocomplete.component.html',
    styleUrl: './variable-autocomplete.component.scss',
    standalone: true,
    imports: [ScrollbarComponent, FormsModule]
})
export class VariableAutocompleteComponent {
    tableName       = input('');
    triggerVariable = input('');
    loopVariable    = input<string>();
    loopTable       = input<string>();
    option          = input.required<SentinelOptionField>();
    multiline       = input(false);

    readonly inputEl = viewChild<ElementRef>('inputEl');

    currentIndex = signal(0);
    results      = signal<Suggestion[]>([]);
    showDropdown = computed(() => this.results().length > 0);
    #cursorPosition = 0;

    readonly #global          = inject(GlobalService);
    readonly #tables          = this.#global.tables;
    readonly #relationshipMap = this.#global.relations;
    readonly #accessorMap     = this.#global.accessors;

    onInput(event: Event) {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement;
        this.#cursorPosition = target.selectionStart ?? 0;
        const value = this.option().value || '';
        const beforeCursor = value.substring(0, this.#cursorPosition);
        const lastOpen = beforeCursor.lastIndexOf('{{');

        if (lastOpen > beforeCursor.lastIndexOf('}}')) {
            this.results.set(this.getSuggestions(beforeCursor.substring(lastOpen + 2)));
            this.currentIndex.set(0);
        } else {
            this.results.set([]);
        }
    }

    onKeydown(event: KeyboardEvent) {
        if (!this.showDropdown()) return;
        switch (event.key) {
            case 'ArrowDown': event.preventDefault(); this.currentIndex.update(i => (i + 1) % this.results().length); break;
            case 'ArrowUp': event.preventDefault(); this.currentIndex.update(i => (this.results().length + i - 1) % this.results().length); break;
            case 'Enter': event.preventDefault(); this.selectResult(this.results()[this.currentIndex()]); break;
            case 'Escape': this.results.set([]); break;
        }
    }

    selectResult(result: Suggestion) {
        const option        = this.option();
        const value         = option.value || '';
        const beforeCursor  = value.substring(0, this.#cursorPosition);
        const afterCursor   = value.substring(this.#cursorPosition);
        const lastOpen      = beforeCursor.lastIndexOf('{{');
        const prefix        = beforeCursor.substring(0, lastOpen + 2);
        const lastDot       = beforeCursor.substring(lastOpen + 2).lastIndexOf('.');
        const basePath      = lastDot >= 0 ? beforeCursor.substring(lastOpen + 2, lastOpen + 2 + lastDot + 1) : '';
        const continuesPath = result.type === 'variable' || result.type === 'relation';
        const suffix        = continuesPath ? '.' : '}}';

        option.value = prefix + basePath + result.name + suffix + afterCursor;
        this.#cursorPosition = (prefix + basePath + result.name + suffix).length;
        this.results.set([]);

        if (continuesPath) {
            setTimeout(() => {
                this.results.set(this.getSuggestions(basePath + result.name + '.'));
                this.currentIndex.set(0);
            }, 0);
        }
    }

    getSuggestions(input: string): Suggestion[] {
        const parts = input.split('.');
        const variables = [
            ...(this.triggerVariable() ? [{ name: this.triggerVariable(), table: this.tableName() }] : []),
            ...(this.loopVariable() && this.loopTable() ? [{ name: this.loopVariable()!, table: this.loopTable()! }] : []),
            { name: 'old', table: this.tableName() }
        ];

        if (parts.length === 1) {
            return variables.filter(v => v.name.startsWith(parts[0])).map(v => ({ name: v.name, type: 'variable' }));
        }

        const usedVar = variables.find(v => v.name === parts[0]);
        if (!usedVar) return [];

        let tableName = usedVar.table;
        for (let i = 1; i < parts.length; i++) {
            const prefix = parts[i];
            const table = this.#tables.find((t: any) => t.name === tableName);
            const relationship = this.#relationshipMap.find((r: any) => r.table === tableName);
            if (!table) return [];

            if (i === parts.length - 1) {
                return [
                    ...(table.columns?.map((c: any) => c.Field) ?? []).filter((c: any) => c.startsWith(prefix)).map((c: any) => ({ name: c, type: 'column' })),
                    ...Object.keys(this.#accessorMap[tableName] ?? {}).filter((a: any) => a.startsWith(prefix)).map((a: any) => ({ name: a, type: 'accessor' })),
                    ...Object.keys(relationship?.relations ?? {}).filter((r: any) => r.startsWith(prefix)).map((r: any) => ({ name: r, type: 'relation' }))
                ];
            }
            const nextRelation = relationship?.relations?.[prefix];
            if (!nextRelation) return [];
            tableName = nextRelation.model?.toLowerCase();
        }
        return [];
    }

    onBlur = () => setTimeout(() => this.results.set([]), 200);
}
