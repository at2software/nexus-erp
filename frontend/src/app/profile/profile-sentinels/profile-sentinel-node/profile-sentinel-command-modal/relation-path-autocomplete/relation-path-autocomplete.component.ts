import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SentinelOptionField } from '@app/profile/profile-sentinels/sentinel-condition-option-field.model';
import { GlobalService } from '@models/global.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

interface RelationEntry {
    name: string;
    type: string;
    model: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'relation-path-autocomplete',
    templateUrl: './relation-path-autocomplete.component.html',
    styleUrl: './relation-path-autocomplete.component.scss',
    imports: [ScrollbarComponent, FormsModule],
})
export class RelationPathAutocompleteComponent {
    minSearch = input<number>(0);
    tableName = input.required<string>();
    triggerVariable = input<string>('');
    option = input.required<SentinelOptionField>();
    relationSelected = output<string>();

    readonly searchbox = viewChild<ElementRef>('searchbox');

    currentIndex = signal(0);
    results = signal<RelationEntry[]>([]);
    hasResults = computed(() => this.results().length > 0);

    readonly #global = inject(GlobalService);
    readonly #relationshipMap = this.#global.relations;
    #delay: ReturnType<typeof setTimeout> | null = null;

    readonly #pathValue = computed(() => {
        const value = this.option().value;
        return typeof value === 'string' ? value : '';
    });

    constructor() {
        afterNextRender(() => this.focus());
    }

    focus = () => this.searchbox()?.nativeElement?.focus();
    blur = () => this.searchbox()?.nativeElement?.blur();
    empty = () => {
        this.option().value = '';
    };
    clear = () => this.results.set([]);

    search(event: KeyboardEvent) {
        const results = this.results();
        if (event.key === 'ArrowDown') {
            this.currentIndex.update((i) => (i + 1) % results.length);
        } else if (event.key === 'ArrowUp') {
            this.currentIndex.update((i) => (results.length + i - 1) % results.length);
        } else if (event.key === 'Enter') {
            this.searchbox()?.nativeElement?.blur();
            this.open(results[this.currentIndex()]);
        } else {
            if (this.#delay) clearTimeout(this.#delay);
            this.#delay = setTimeout(() => this.searchDelayed(), 300);
        }
    }

    searchDelayed() {
        this.currentIndex.set(0);
        this.results.set(this.getSuggestions(this.#pathValue(), this.tableName()));
        this.focus();
    }

    open(o: RelationEntry) {
        if (!o) return;
        this.results.set([]);
        const val = this.#pathValue();
        const lastDotIndex = val.lastIndexOf('.');
        this.option().value = lastDotIndex !== -1 ? val.substring(0, lastDotIndex + 1) + o.name : o.name;

        if (['hasMany', 'belongsToMany', 'morphMany', 'morphToMany'].includes(o.type)) {
            this.relationSelected.emit(o.name);
        } else {
            this.option().value = `${this.option().value}.`;
            this.focus();
            this.searchDelayed();
        }
    }

    getSuggestions(value: string, currentTable: string): RelationEntry[] {
        const parts = value.split('.');
        let tableName = currentTable;

        if (parts.length === 1) {
            const tv = this.triggerVariable();
            return tv && tv.startsWith(parts[0]) ? [{ name: tv, type: 'variable', model: currentTable }] : [];
        }

        if (parts[0] !== this.triggerVariable()) return [];
        const pathParts = parts.slice(1);

        let suggestions: RelationEntry[] = [];
        for (let i = 0; i < pathParts.length; i++) {
            const isLast = i === pathParts.length - 1;
            const prefix = pathParts[i];
            const relationship = this.#relationshipMap.find((r) => r.table === tableName);
            if (!relationship?.relations) return [];

            const relations = Object.entries(relationship.relations) as [string, { type: string; model?: string }][];

            if (isLast) {
                suggestions = relations.filter(([name]) => name.startsWith(prefix)).map(([name, rel]) => ({ name, type: rel.type, model: rel.model ?? '' }));
            } else {
                const nextRelation = (relationship.relations as any)[prefix];
                if (!nextRelation) return [];
                tableName = nextRelation.model?.toLowerCase() ?? '';
            }
        }
        return suggestions;
    }
}
