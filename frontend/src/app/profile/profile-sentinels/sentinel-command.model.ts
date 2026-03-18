import { ALL_TRIGGERS, MODEL_BASED_TRIGGERS, ObserverTrigger } from "src/enums/observer-trigger";
import { SentinelOptionFieldType } from "./sentinel-option-field-type.model";
import { SentinelOptionField } from "./sentinel-condition-option-field.model";


export class SentinelCommand {
  label: string;
  key: string;
  allowedTriggerTypes: ObserverTrigger[];
  options?: SentinelOptionField[];
  hasNestedConditions?: boolean;
  hasNestedActions?: boolean;
}

export const SENTINEL_COMMANDS: SentinelCommand[] = [
  {
    label: 'None',
    key: 'none',
    allowedTriggerTypes: ALL_TRIGGERS
  },
  {
    label: 'Mattermost Post',
    key: 'mattermost_post',
    allowedTriggerTypes: ALL_TRIGGERS,
    options: [
      {
        key: 'channel_id',
        label: 'Channel ID',
        type: SentinelOptionFieldType.String,
        default: ''
      },
      {
        key: 'message',
        label: 'Message',
        type: SentinelOptionFieldType.String,
        default: ''
      }
    ]
  },
  {
    label: 'Setting Value',
    key: 'set_value',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: [
      {
        key: 'column',
        label: 'Column',
        type: SentinelOptionFieldType.Column,
        default: '1'
      },
      {
        key: 'input',
        label: 'Value',
        type: SentinelOptionFieldType.String,
        default: ''
      },
    ]
  },
  {
    label: 'For Each',
    key: 'for_each',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    hasNestedConditions: true,
    hasNestedActions: true,
    options: [
      {
        key: 'relation',
        label: 'Iterate Over',
        type: SentinelOptionFieldType.Relation,
        default: '',
        placeholder: 'assignees or assignedContacts()'
      },
      {
        key: 'variable',
        label: 'Variable Name',
        type: SentinelOptionFieldType.String,
        default: 'item',
        placeholder: 'item'
      },
    ]
  },
  {
    label: 'Create New',
    key: 'create_new',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: [
      {
        key: 'table',
        label: 'Model',
        type: SentinelOptionFieldType.Table,
        default: ''
      },
      {
        key: 'fields',
        label: 'Fields',
        type: SentinelOptionFieldType.ModelFields,
        default: '{}'
      }
    ]
  },
]
