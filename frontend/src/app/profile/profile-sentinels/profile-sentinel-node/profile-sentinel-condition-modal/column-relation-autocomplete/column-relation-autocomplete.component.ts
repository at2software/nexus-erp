import { ChangeDetectionStrategy, afterNextRender, Component, computed, inject, input, signal, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SentinelOptionField } from '@app/profile/profile-sentinels/sentinel-condition-option-field.model';
import { GlobalService } from '@models/global.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'column-relation-autocomplete',
    templateUrl: './column-relation-autocomplete.component.html',
    styleUrl: './column-relation-autocomplete.component.scss',
    imports: [ScrollbarComponent, FormsModule],
})
export class ColumnRelationAutocompleteComponent {
    minSearch = input<number>(0);
    tableName = input<string>('');
    option = input.required<SentinelOptionField>();
    triggerVariable = input<string>('');
    variableContext = input<{ name: string; table: string } | undefined>();

    readonly searchbox = viewChild.required<ElementRef>('searchbox');

    currentIndex = signal(0);
    results = signal<{ name: string; type: string }[]>([]);
    hasResults = computed(() => this.results().length > 0);

    #delay: ReturnType<typeof setTimeout> | undefined;
    #global = inject(GlobalService);

    constructor() {
        afterNextRender(() => this.#focus());
    }

    #focus() {
        this.searchbox().nativeElement.focus();
    }

    #stringValue(): string {
        const value = this.option().value;
        return typeof value === 'string' ? value : '';
    }

    search(event: KeyboardEvent) {
        const len = this.results().length;
        switch (event.key) {
            case 'ArrowDown':
                this.currentIndex.set((this.currentIndex() + 1) % len);
                break;
            case 'ArrowUp':
                this.currentIndex.set((len + this.currentIndex() - 1) % len);
                break;
            case 'Enter':
                this.searchbox().nativeElement.blur();
                this.open(this.results()[this.currentIndex()]);
                break;
            default:
                if (((event.target as HTMLInputElement)?.value?.length ?? 0) >= this.minSearch()) {
                    clearTimeout(this.#delay);
                    this.#delay = setTimeout(() => {
                        this.currentIndex.set(0);
                        this.results.set(this.#getSuggestions(this.#stringValue(), this.tableName()));
                        this.#focus();
                    }, 500);
                }
        }
    }

    open(o: { name: string; type: string }) {
        this.results.set([]);
        const val = this.#stringValue();
        const lastDot = val.lastIndexOf('.');
        this.option().value = (lastDot !== -1 ? val.substring(0, lastDot + 1) : '') + o.name;
        if (o.type === 'relation' || o.type === 'variable') {
            this.option().value = this.#stringValue() + '.';
            this.#focus();
            this.currentIndex.set(0);
            this.results.set(this.#getSuggestions(this.#stringValue(), this.tableName()));
        }
    }

    #getSuggestions(query: string, currentTable: string): { name: string; type: string }[] {
        const parts = query.split('.');
        const tv = this.triggerVariable();
        const vc = this.variableContext();
        const variables = [...(tv ? [{ name: tv, table: currentTable }] : []), ...(vc ? [{ name: vc.name, table: vc.table }] : [])];

        if (parts.length === 1) {
            return variables.filter((v) => v.name.startsWith(parts[0])).map((v) => ({ name: v.name, type: 'variable' }));
        }

        const usedVar = variables.find((v) => v.name === parts[0]);
        if (!usedVar) return [];

        let tableName = usedVar.table;
        for (let i = 1; i < parts.length; i++) {
            const prefix = parts[i];
            const table = this.#global.tables.find((t) => t.name === tableName);
            const relationship = this.#global.relations.find((r) => r.table === tableName);
            if (!table) return [];

            const filterAndMap = (array: string[], type: string) => array
                .filter((v) => v !== null && v.toLowerCase().startsWith(prefix.toLowerCase()))
                .map((name) => ({ name, type }));

            if (i === parts.length - 1) {
                return [
                    ...filterAndMap(table.columns.map((c) => c.Field), 'column'),
                    ...filterAndMap(Object.keys(this.#global.accessors[tableName] ?? {}), 'accessor'),
                    ...filterAndMap(Object.keys(relationship?.relations ?? {}), 'relation'),
                ];
            }
            const nextRelation = relationship?.relations?.[prefix];
            if (!nextRelation) return [];
            tableName = (nextRelation.model ?? '').toLowerCase();
        }
        return [];
    }
}
