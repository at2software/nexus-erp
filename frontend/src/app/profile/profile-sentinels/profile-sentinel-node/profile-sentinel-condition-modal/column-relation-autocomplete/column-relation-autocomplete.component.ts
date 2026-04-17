import { afterNextRender, Component, computed, inject, input, signal, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SentinelOptionField } from '@app/profile/profile-sentinels/sentinel-condition-option-field.model';
import { GlobalService } from '@models/global.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

@Component({
  selector: 'column-relation-autocomplete',
  templateUrl: './column-relation-autocomplete.component.html',
  styleUrl: './column-relation-autocomplete.component.scss',
  standalone: true,
  imports: [ScrollbarComponent, FormsModule]
})
export class ColumnRelationAutocompleteComponent {
  minSearch       = input<number>(0);
  tableName       = input<string>('');
  option          = input.required<SentinelOptionField>();
  triggerVariable = input<string>('');
  variableContext = input<{ name: string; table: string } | undefined>();

  readonly searchbox = viewChild.required<ElementRef>('searchbox');

  currentIndex = signal(0);
  results      = signal<{ name: string; type: string }[]>([]);
  hasResults   = computed(() => this.results().length > 0);

  #delay: ReturnType<typeof setTimeout> | undefined;
  #global = inject(GlobalService);

  constructor() {
    afterNextRender(() => this.#focus());
  }

  #focus() {
    this.searchbox().nativeElement.focus();
  }

  search(event: KeyboardEvent) {
    const len = this.results().length;
    switch (event.key) {
      case 'ArrowDown': this.currentIndex.set((this.currentIndex() + 1) % len); break;
      case 'ArrowUp': this.currentIndex.set((len + this.currentIndex() - 1) % len); break;
      case 'Enter': this.searchbox().nativeElement.blur(); this.open(this.results()[this.currentIndex()]); break;
      default:
        if (((event.target as HTMLInputElement)?.value?.length ?? 0) >= this.minSearch()) {
          clearTimeout(this.#delay);
          this.#delay = setTimeout(() => {
            this.currentIndex.set(0);
            this.results.set(this.#getSuggestions(this.option().value, this.tableName()));
            this.#focus();
          }, 500);
        }
    }
  }

  open(o: { name: string; type: string }) {
    this.results.set([]);
    const lastDot = this.option().value.lastIndexOf('.');
    this.option().value = (lastDot !== -1 ? this.option().value.substring(0, lastDot + 1) : '') + o.name;
    if (o.type === 'relation' || o.type === 'variable') {
      this.option().value += '.';
      this.#focus();
      this.currentIndex.set(0);
      this.results.set(this.#getSuggestions(this.option().value, this.tableName()));
    }
  }

  #getSuggestions(query: string, currentTable: string): { name: string; type: string }[] {
    const parts = query.split('.');
    const tv = this.triggerVariable();
    const vc = this.variableContext();
    const variables = [
      ...(tv ? [{ name: tv, table: currentTable }] : []),
      ...(vc ? [{ name: vc.name, table: vc.table }] : [])
    ];

    if (parts.length === 1) {
      return variables.filter(v => v.name.startsWith(parts[0])).map(v => ({ name: v.name, type: 'variable' }));
    }

    const usedVar = variables.find(v => v.name === parts[0]);
    if (!usedVar) return [];

    let tableName = usedVar.table;
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts[i];
      const table = this.#global.tables.find(t => t.name === tableName);
      const relationship = this.#global.relations.find(r => r.table === tableName);
      if (!table) return [];

      if (i === parts.length - 1) {
        return [
          ...(table.columns?.map((c: any) => c.Field) ?? []).filter((c: string) => c.startsWith(prefix)).map((c: string) => ({ name: c, type: 'column' })),
          ...Object.keys(this.#global.accessors[tableName] ?? {}).filter(a => a.startsWith(prefix)).map(a => ({ name: a, type: 'accessor' })),
          ...Object.keys(relationship?.relations ?? {}).filter(r => r.startsWith(prefix)).map(r => ({ name: r, type: 'relation' }))
        ];
      }
      const nextRelation = relationship?.relations?.[prefix];
      if (!nextRelation) return [];
      tableName = nextRelation.model.toLowerCase();
    }
    return [];
  }
}
