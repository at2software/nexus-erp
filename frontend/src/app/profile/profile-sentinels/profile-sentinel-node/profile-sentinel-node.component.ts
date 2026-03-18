import { ObserverTrigger } from 'src/enums/observer-trigger';
import { SentinelNode } from '@models/sentinel-node.model';
import { SentinelNodeType } from '../../../../enums/sentinel-node.type';
import { Component, ElementRef, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { Sentinel } from '@models/sentinel.model';
import { SENTINEL_CONDITIONS } from '../sentinel-condition.model';
import { SENTINEL_COMMANDS, SentinelCommand } from '../sentinel-command.model';
import { SentinelOptionFieldType } from '../sentinel-option-field-type.model';
import { SentinelOptionField } from '../sentinel-condition-option-field.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'profile-sentinel-node',
  templateUrl: './profile-sentinel-node.component.html',
  styleUrl: './profile-sentinel-node.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class ProfileSentinelNodeComponent implements OnChanges {
  @Input() node!: SentinelNode;
  @Input() sentinel!: Sentinel;
  @Input() width: number = 0;
  @Input() height: number = 0;
  @Input() column: number = 0;
  @Input() row: number = 0;
  @Output() deleteNode = new EventEmitter<void>();
  @Output() editNode = new EventEmitter<void>();

  SentinelNodeType = SentinelNodeType;
  ObserverTrigger = ObserverTrigger;
  allConditions = SENTINEL_CONDITIONS;
  allCommands = SENTINEL_COMMANDS;

  columnOptions?: SentinelOptionField[];
  options?: SentinelOptionField[];
  commands?: SentinelCommand[];

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: any){
    if ('sentinel' in changes) {
      this.reload();
    }
  }

  reload() {
    if(this.node?.type == SentinelNodeType.Condition){
      const conditions = JSON.parse(this.sentinel.condition || '[]');
      if (conditions.length > this.column && conditions[this.column].length > this.row) {
        const condition = conditions[this.column][this.row];
        const defaultCondition = this.getCondition(condition.key);
        this.columnOptions = condition.options?.filter((o: SentinelOptionField) => defaultCondition?.options?.filter(x => x.key == o.key).first()?.type == SentinelOptionFieldType.Column);
        this.options = condition.options?.filter((o: SentinelOptionField) => defaultCondition?.options?.filter(x => x.key == o.key).first()?.type != SentinelOptionFieldType.Column);
      }
    }
  }

  onDelete() {
    this.deleteNode.emit();
  }

  onEdit() {
    this.editNode.emit();
  }

  getCondition(key?: string){
    if(key == undefined) return undefined;
    return this.allConditions.filter(condition => condition.key == key).first();
  }

  getNodeTypeClass(type: SentinelNodeType){
    return SentinelNodeType[type].toLocaleLowerCase();
  }

  isCondition = () => this.node.type == SentinelNodeType.Condition;

  getCommandLabel() {
    if(this.sentinel.result){
      const commands = JSON.parse(this.sentinel.result);
      if(commands.length >= 1){
        const key = commands[0].key;
        return this.allCommands.filter(command => command.key == key).first()?.label;
      }
    }
    return undefined;
  }

}
