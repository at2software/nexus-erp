import { Component, inject, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SentinelOptionField } from '@app/profile/profile-sentinels/sentinel-condition-option-field.model';
import { GlobalService } from '@models/global.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

@Component({
  selector: 'variable-autocomplete',
  templateUrl: './variable-autocomplete.component.html',
  styleUrl: './variable-autocomplete.component.scss',
  standalone: true,
  imports: [ScrollbarComponent, FormsModule]
})
export class VariableAutocompleteComponent {
  @Input() tableName = '';
  @Input() triggerVariable = '';
  @Input() loopVariable?: string;
  @Input() loopTable?: string;
  @Input() option: SentinelOptionField;
  @Input() multiline = false;
  @ViewChild('inputEl') inputEl: any;

  currentIndex = 0;
  results: { name: string, type: string }[] = [];
  showDropdown = false;
  cursorPosition = 0;

  #global = inject(GlobalService);
  tables = this.#global.tables;
  relationshipMap = this.#global.relations;
  accessorMap = this.#global.accessors;

  onInput(event: any) {
    this.cursorPosition = event.target.selectionStart;
    const value = this.option.value || '';
    const beforeCursor = value.substring(0, this.cursorPosition);
    const lastOpen = beforeCursor.lastIndexOf('{{');

    if (lastOpen > beforeCursor.lastIndexOf('}}')) {
      this.results = this.getSuggestions(beforeCursor.substring(lastOpen + 2));
      this.showDropdown = this.results.length > 0;
      this.currentIndex = 0;
    } else {
      this.showDropdown = false;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (!this.showDropdown) return;
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); this.currentIndex = (this.currentIndex + 1) % this.results.length; break;
      case 'ArrowUp': event.preventDefault(); this.currentIndex = (this.results.length + this.currentIndex - 1) % this.results.length; break;
      case 'Enter': event.preventDefault(); this.selectResult(this.results[this.currentIndex]); break;
      case 'Escape': this.showDropdown = false; break;
    }
  }

  selectResult(result: { name: string, type: string }) {
    const value = this.option.value || '';
    const beforeCursor = value.substring(0, this.cursorPosition);
    const afterCursor = value.substring(this.cursorPosition);
    const lastOpen = beforeCursor.lastIndexOf('{{');
    const prefix = beforeCursor.substring(0, lastOpen + 2);
    const lastDot = beforeCursor.substring(lastOpen + 2).lastIndexOf('.');
    const basePath = lastDot >= 0 ? beforeCursor.substring(lastOpen + 2, lastOpen + 2 + lastDot + 1) : '';
    const continuesPath = result.type === 'variable' || result.type === 'relation';
    const suffix = continuesPath ? '.' : '}}';

    this.option.value = prefix + basePath + result.name + suffix + afterCursor;
    this.cursorPosition = (prefix + basePath + result.name + suffix).length;
    this.showDropdown = false;

    if (continuesPath) {
      setTimeout(() => {
        this.results = this.getSuggestions(basePath + result.name + '.');
        this.showDropdown = this.results.length > 0;
        this.currentIndex = 0;
      }, 0);
    }
  }

  getSuggestions(input: string): { name: string, type: string }[] {
    const parts = input.split('.');
    const variables = [
      ...(this.triggerVariable ? [{ name: this.triggerVariable, table: this.tableName }] : []),
      ...(this.loopVariable && this.loopTable ? [{ name: this.loopVariable, table: this.loopTable }] : []),
      { name: 'old', table: this.tableName }
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
      tableName = nextRelation.model?.toLowerCase();
    }
    return [];
  }

  onBlur = () => setTimeout(() => this.showDropdown = false, 200);
}
