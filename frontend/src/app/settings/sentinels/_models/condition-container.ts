import { Component, Input } from "@angular/core"
import { TCondition, ConditionType } from "./condition-tree.const"
import { ConditionDateComponent, ConditionInputComponent, ConditionLabelComponent, ConditionNowComponent, ConditionSelectComponent } from "./sentinel-condition"

@Component({
    selector: 'condition', templateUrl: './condition-container.html', styleUrls: ['./condition-container.scss'],
    standalone: true,
    imports: [ConditionLabelComponent, ConditionDateComponent, ConditionInputComponent, ConditionSelectComponent, ConditionNowComponent]
})
export class ConditionContainer {
    @Input() condition  : TCondition
    isLabel  = (_: TCondition): boolean => _.type === ConditionType.Label
    isDate   = (_: TCondition): boolean => _.type === ConditionType.Date
    isInput  = (_: TCondition): boolean => _.type === ConditionType.Input
    isSelect = (_: TCondition): boolean => _.type === ConditionType.Select
    isNow    = (_: TCondition): boolean => _.type === ConditionType.Now
}