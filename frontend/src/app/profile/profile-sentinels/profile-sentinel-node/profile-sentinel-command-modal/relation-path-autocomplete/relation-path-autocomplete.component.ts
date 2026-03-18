import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SentinelOptionField } from '@app/profile/profile-sentinels/sentinel-condition-option-field.model';
import { GlobalService } from '@models/global.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

@Component({
  selector: 'relation-path-autocomplete',
  templateUrl: './relation-path-autocomplete.component.html',
  styleUrl: './relation-path-autocomplete.component.scss',
  standalone: true,
  imports: [ScrollbarComponent, FormsModule]
})
export class RelationPathAutocompleteComponent {
  @Input() minSearch: number = 0;
  @Input() tableName: string = '';
  @Input() triggerVariable: string = '';
  @Input() option: SentinelOptionField;
  @Output() relationSelected = new EventEmitter<string>();

  @ViewChild('searchbox') searchbox: any;

  currentIndex: number = 0;
  results: { name: string, type: string, model: string }[] = [];
  relationshipMap: any[] = [];

  #delay: any;
  #global = inject(GlobalService);
  el = inject(ElementRef);

  hasResults = () => this.results.length;
  focus = () => this.searchbox?.nativeElement?.focus();
  empty = () => this.option.value = '';
  blur = () => this.searchbox?.nativeElement?.blur();
  clear = () => this.results = [];

  ngOnInit = () => this.focus();

  constructor() {
    this.relationshipMap = this.#global.relations;
  }

  search(event: any) {
    if (event.keyCode == 40) this.currentIndex = (this.currentIndex + 1) % this.results.length;
    else if (event.keyCode == 38) this.currentIndex = (this.results.length + this.currentIndex - 1) % this.results.length;
    else if (event.keyCode == 13) {
      this.searchbox.nativeElement.blur();
      this.open(this.results[this.currentIndex]);
    } else {
      if (this.#delay) clearTimeout(this.#delay);
      this.#delay = setTimeout(() => this.searchDelayed(), 300);
    }
  }

  searchDelayed() {
    this.currentIndex = 0;
    this.results = this.getSuggestions(this.option.value, this.tableName);
    this.focus();
  }

  open(o: { name: string, type: string, model: string }) {
    if (!o) return;
    this.results = [];
    const lastDotIndex = this.option.value.lastIndexOf('.');
    this.option.value = lastDotIndex !== -1
      ? this.option.value.substring(0, lastDotIndex + 1) + o.name
      : o.name;

    // If it's a toMany relation, emit the final selection
    if (['hasMany', 'belongsToMany', 'morphMany', 'morphToMany'].includes(o.type)) {
      this.relationSelected.emit(o.name);
    } else {
      // It's a toOne relation, add dot and continue
      this.option.value += '.';
      this.focus();
      this.searchDelayed();
    }
  }

  getSuggestions(input: string, currentTable: string): { name: string, type: string, model: string }[] {
    const parts = input.split('.');
    let tableName = currentTable;
    let suggestions: { name: string, type: string, model: string }[] = [];

    // First part must be the trigger variable
    if (parts.length === 1) {
      const prefix = parts[0];
      if (this.triggerVariable && this.triggerVariable.startsWith(prefix)) {
        return [{ name: this.triggerVariable, type: 'variable', model: currentTable }];
      }
      return [];
    }

    // Must start with trigger variable
    if (parts[0] !== this.triggerVariable) return [];
    const pathParts = parts.slice(1); // Remove variable prefix

    for (let i = 0; i < pathParts.length; i++) {
      const isLast = i === pathParts.length - 1;
      const prefix = pathParts[i];

      const relationship = this.relationshipMap.find(r => r.table === tableName);
      if (!relationship?.relations) return [];

      const relations = Object.entries(relationship.relations) as [string, { type: string, model?: string }][];

      if (isLast) {
        suggestions = relations
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, rel]) => ({ name, type: rel.type, model: rel.model || '' }));
      } else {
        const nextRelation = relationship.relations[prefix];
        if (!nextRelation) return [];
        tableName = this.modelToTableName(nextRelation.model);
      }
    }

    return suggestions;
  }

  modelToTableName(model: string): string {
    return model?.toLowerCase() || '';
  }
}
