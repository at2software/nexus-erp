import { Component, inject, Input, ViewChild } from '@angular/core';
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
  @Input() minSearch = 0;
  @Input() tableName = '';
  @Input() option: SentinelOptionField;
  @Input() triggerVariable = '';
  @Input() variableContext?: { name: string, table: string };
  @ViewChild('searchbox') searchbox: any;

  currentIndex = 0;
  results: { name: string, type: string }[] = [];
  #delay: any;

  #global = inject(GlobalService);
  tables = this.#global.tables;
  relationshipMap = this.#global.relations;
  accessorMap = this.#global.accessors;

  hasResults = () => this.results.length;
  focus = () => this.searchbox.nativeElement.focus();
  ngOnInit = () => this.focus();

  search(event: any) {
    const len = this.results.length;
    switch (event.keyCode) {
      case 40: this.currentIndex = (this.currentIndex + 1) % len; break;
      case 38: this.currentIndex = (len + this.currentIndex - 1) % len; break;
      case 13: this.searchbox.nativeElement.blur(); this.open(this.results[this.currentIndex]); break;
      default:
        if ((event.target?.value?.length ?? 0) >= this.minSearch) {
          if (this.#delay) clearTimeout(this.#delay);
          this.#delay = setTimeout(() => {
            this.currentIndex = 0;
            this.results = this.getSuggestions(this.option.value, this.tableName);
            this.focus();
          }, 500);
        }
    }
  }

  open(o: any) {
    this.results = [];
    const lastDot = this.option.value.lastIndexOf('.');
    this.option.value = (lastDot !== -1 ? this.option.value.substring(0, lastDot + 1) : '') + o.name;
    if (o.type === 'relation' || o.type === 'variable') {
      this.option.value += '.';
      this.focus();
      this.currentIndex = 0;
      this.results = this.getSuggestions(this.option.value, this.tableName);
    }
  }

  getSuggestions(input: string, currentTable: string): { name: string, type: string }[] {
    const parts = input.split('.');
    const variables = [
      ...(this.triggerVariable ? [{ name: this.triggerVariable, table: currentTable }] : []),
      ...(this.variableContext ? [{ name: this.variableContext.name, table: this.variableContext.table }] : [])
    ];

    if (parts.length === 1) {
      return variables.filter(v => v.name.startsWith(parts[0])).map(v => ({ name: v.name, type: 'variable' }));
    }

    const usedVar = variables.find(v => v.name === parts[0]);
    if (!usedVar) return [];

    let tableName = usedVar.table;
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts[i];
      const table = this.tables.find(t => t.name === tableName);
      const relationship = this.relationshipMap.find(r => r.table === tableName);
      if (!table) return [];

      if (i === parts.length - 1) {
        return [
          ...(table.columns?.map((c:any) => c.Field) ?? []).filter((c:any) => c.startsWith(prefix)).map((c:any) => ({ name: c, type: 'column' })),
          ...Object.keys(this.accessorMap[tableName] ?? {}).filter((a:any) => a.startsWith(prefix)).map((a:any) => ({ name: a, type: 'accessor' })),
          ...Object.keys(relationship?.relations ?? {}).filter((r:any) => r.startsWith(prefix)).map((r:any) => ({ name: r, type: 'relation' }))
        ];
      }
      const nextRelation = relationship?.relations?.[prefix];
      if (!nextRelation) return [];
      tableName = nextRelation.model.toLowerCase();
    }
    return [];
  }
}
