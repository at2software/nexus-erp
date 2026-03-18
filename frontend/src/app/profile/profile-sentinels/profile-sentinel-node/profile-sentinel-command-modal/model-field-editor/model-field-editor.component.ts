import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GlobalService } from '@models/global.service';

export interface FieldValue { field: string; enabled: boolean; value: string; }

@Component({
  selector: 'model-field-editor',
  templateUrl: './model-field-editor.component.html',
  styleUrl: './model-field-editor.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ModelFieldEditorComponent implements OnChanges {
  @Input() targetTable = '';
  @Input() sourceTable = '';
  @Input() triggerVariable = '';
  @Input() loopVariable?: string;
  @Input() loopTable?: string;
  @Input() fieldsJson = '{}';
  @Output() fieldsJsonChange = new EventEmitter<string>();

  fields: FieldValue[] = [];
  activeField: string | null = null;
  suggestions: { name: string; type: string }[] = [];
  suggestionIndex = 0;

  #global = inject(GlobalService);
  tables = this.#global.tables;
  relationshipMap = this.#global.relations;
  accessorMap = this.#global.accessors;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetTable'] && this.targetTable) this.loadColumns();
    if (changes['fieldsJson']) this.parseFieldsJson();
  }

  loadColumns() {
    const table = this.tables.find(t => t.name === this.targetTable);
    if (!table) return;
    const existing = this.getExistingValues();
    this.fields = table.columns.map((col:any) => ({
      field: col.Field,
      enabled: existing[col.Field] !== undefined,
      value: existing[col.Field] || ''
    }));
  }

  getExistingValues(): Record<string, string> {
    try { return JSON.parse(this.fieldsJson || '{}'); }
    catch { return {}; }
  }

  parseFieldsJson() {
    if (!this.fields.length) return;
    const values = this.getExistingValues();
    this.fields.forEach(f => {
      if (values[f.field] !== undefined) {
        f.enabled = true;
        f.value = values[f.field];
      }
    });
  }

  emitChanges() {
    const result: Record<string, string> = {};
    this.fields.filter(f => f.enabled).forEach(f => result[f.field] = f.value);
    this.fieldsJsonChange.emit(JSON.stringify(result));
  }

  onFieldToggle(field: FieldValue) {
    if (!field.enabled) field.value = '';
    this.emitChanges();
  }

  onValueChange = () => this.emitChanges();

  onInputKeyup(event: KeyboardEvent, field: FieldValue) {
    switch (event.key) {
      case 'ArrowDown': this.suggestionIndex = (this.suggestionIndex + 1) % Math.max(1, this.suggestions.length); break;
      case 'ArrowUp': this.suggestionIndex = (this.suggestions.length + this.suggestionIndex - 1) % Math.max(1, this.suggestions.length); break;
      case 'Enter': if (this.suggestions.length) { this.selectSuggestion(field, this.suggestions[this.suggestionIndex]); event.preventDefault(); } break;
      case 'Escape': this.closeSuggestions(); break;
      default: this.updateSuggestions(field);
    }
  }

  onInputFocus(field: FieldValue) {
    this.activeField = field.field;
    this.updateSuggestions(field);
  }

  onInputBlur = () => setTimeout(() => this.closeSuggestions(), 200);

  closeSuggestions() {
    this.activeField = null;
    this.suggestions = [];
    this.suggestionIndex = 0;
  }

  updateSuggestions(field: FieldValue) {
    const match = field.value.match(/\{\{([^}]*)$/);
    this.suggestions = match ? this.getSuggestions(match[1], this.sourceTable) : [];
    this.suggestionIndex = 0;
  }

  selectSuggestion(field: FieldValue, suggestion: { name: string; type: string }) {
    const match = field.value.match(/^(.*\{\{)([^}]*)$/);
    if (!match) return;

    const prefix = match[1];
    const pathParts = match[2].split('.');
    pathParts.pop();
    const basePath = pathParts.length > 0 ? pathParts.join('.') + '.' : '';
    const continuesPath = suggestion.type === 'relation' || suggestion.type === 'variable';

    field.value = prefix + basePath + suggestion.name + (continuesPath ? '.' : '}}');
    if (continuesPath) this.updateSuggestions(field);
    else this.closeSuggestions();
    this.emitChanges();
  }

  getSuggestions(input: string, currentTable: string): { name: string; type: string }[] {
    const parts = input.split('.');
    const variables = [
      ...(this.triggerVariable ? [{ name: this.triggerVariable, table: currentTable }] : []),
      ...(this.loopVariable && this.loopTable ? [{ name: this.loopVariable, table: this.loopTable }] : []),
      { name: 'old', table: currentTable }
    ];

    if (parts.length === 1) {
      return variables.filter(v => v.name.toLowerCase().startsWith(parts[0].toLowerCase())).map(v => ({ name: v.name, type: 'variable' }));
    }

    const usedVar = variables.find(v => v.name === parts[0]);
    if (!usedVar) return [];

    let tableName = usedVar.table;
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts[i].toLowerCase();
      const table = this.tables.find(t => t.name === tableName);
      const relationship = this.relationshipMap.find(r => r.table === tableName);
      if (!table) return [];

      if (i === parts.length - 1) {
        return [
          ...(table.columns?.map((c:any) => c.Field) ?? []).filter((c:any) => c.toLowerCase().startsWith(prefix)).map((c:any) => ({ name: c, type: 'column' })),
          ...Object.keys(this.accessorMap[tableName] ?? {}).filter((a:any) => a.toLowerCase().startsWith(prefix)).map((a:any) => ({ name: a, type: 'accessor' })),
          ...Object.keys(relationship?.relations ?? {}).filter((r:any) => r.toLowerCase().startsWith(prefix)).map((r:any) => ({ name: r, type: 'relation' }))
        ];
      }
      const nextRelation = relationship?.relations?.[parts[i]];
      if (!nextRelation) return [];
      tableName = nextRelation.model.toLowerCase();
    }
    return [];
  }
}
