import { SentinelOptionFieldType } from "./sentinel-option-field-type.model";

export interface SentinelOptionField {
  key: string;
  label?: string;
  value?: any;
  type: SentinelOptionFieldType;
  default?: any;
  placeholder?: any;
  enumValues?: {label: string, value: string}[]; // if type === Enum
}

