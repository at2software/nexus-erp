import { ALL_TRIGGERS, MODEL_BASED_TRIGGERS, ObserverTrigger } from "src/enums/observer-trigger";
import { SentinelOptionFieldType } from "./sentinel-option-field-type.model";
import { SentinelOptionField } from "./sentinel-condition-option-field.model";


const WEEKDAYS: { label: string, value: string }[] = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' }
];
const RECCURING_WEEKS: { label: string, value: string }[] = [
    { label: 'first', value: '1' },
    { label: 'second', value: '2' },
    { label: 'third', value: '3' },
    { label: 'fourth', value: '4' },
    { label: 'last', value: '-1' }
];
const MONTHS: { label: string, value: string }[] = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
];
const MODEL_BASED_STRING_OPTIONS = [
  {
    key: 'input',
    type: SentinelOptionFieldType.String,
    default: ''
  },
  {
    key: 'column',
    label: 'Column',
    type: SentinelOptionFieldType.Column,
    default: '1'
  }
];


export class SentinelCondition {
  label: string;
  key: string;
  allowedTriggerTypes: ObserverTrigger[];
  options?: SentinelOptionField[];
  inverted?: boolean = false;
}

export const SENTINEL_CONDITIONS: SentinelCondition[] = [
  {
    label: 'None',
    key: 'none',
    allowedTriggerTypes: ALL_TRIGGERS
  },
  {
    label: 'Day in Month',
    key: 'day_in_month',
    allowedTriggerTypes: [ObserverTrigger.OnSchedule],
    options: [{
      key: 'input',
      type: SentinelOptionFieldType.String,
      default: '1',
      placeholder: '1, ..., 31, -1, -2'
    }]
  },
  {
    label: 'Month',
    key: 'month',
    allowedTriggerTypes: [ObserverTrigger.OnSchedule],
    options: [{
      key: 'input',
      type: SentinelOptionFieldType.Enum,
      enumValues: MONTHS,
      default: '1'
    }]
  },
  {
    label: 'Weekday',
    key: 'weekday',
    allowedTriggerTypes: [ObserverTrigger.OnSchedule],
    options: [
      {
        key: 'input',
        type: SentinelOptionFieldType.Enum,
        enumValues: WEEKDAYS,
        default: '1'
      },
      {
        key: 'by_occurence_in_month',
        label: 'By Occurrence in Month',
        type: SentinelOptionFieldType.Boolean,
        default: false
      },
      {
        key: 'occurence_in_month',
        label: 'Occurrence in Month',
        type: SentinelOptionFieldType.Enum,
        enumValues: RECCURING_WEEKS,
        default: '1'
      }
    ]
  },

  {
    label: 'Contains',
    key: 'contains',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Matches',
    key: 'match',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Starts With',
    key: 'starts_with',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Ends With',
    key: 'ends_with',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Is Equal',
    key: 'equal',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Is Not Equal',
    key: 'not_equal',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Is Greater',
    key: 'greater',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Is Less',
    key: 'less',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Is True',
    key: 'true',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: [
      {
        key: 'column',
        label: 'Column',
        type: SentinelOptionFieldType.Column,
        default: '1'
      }
    ]
  },
  {
    label: 'Is False',
    key: 'false',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: [
      {
        key: 'column',
        label: 'Column',
        type: SentinelOptionFieldType.Column,
        default: '1'
      }
    ]
  },
  {
    label: 'Empty',
    key: 'null',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: [
      {
        key: 'column',
        label: 'Column',
        type: SentinelOptionFieldType.Column,
        default: '1'
      }
    ]
  },
  {
    label: 'Not Empty',
    key: 'not_null',
    allowedTriggerTypes: MODEL_BASED_TRIGGERS,
    options: [
      {
        key: 'column',
        label: 'Column',
        type: SentinelOptionFieldType.Column,
        default: '1'
      }
    ]
  },
  // Old value comparison operators (for OnUpdated trigger)
  {
    label: 'Was Equal',
    key: 'was_equal',
    allowedTriggerTypes: [ObserverTrigger.OnUpdated],
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Was Not Equal',
    key: 'was_not_equal',
    allowedTriggerTypes: [ObserverTrigger.OnUpdated],
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Changed',
    key: 'changed',
    allowedTriggerTypes: [ObserverTrigger.OnUpdated],
    options: [
      {
        key: 'column',
        label: 'Column',
        type: SentinelOptionFieldType.Column,
        default: '1'
      }
    ]
  },
  {
    label: 'Changed To',
    key: 'changed_to',
    allowedTriggerTypes: [ObserverTrigger.OnUpdated],
    options: MODEL_BASED_STRING_OPTIONS
  },
  {
    label: 'Changed From',
    key: 'changed_from',
    allowedTriggerTypes: [ObserverTrigger.OnUpdated],
    options: MODEL_BASED_STRING_OPTIONS
  },
]
