export enum SentinelOptionFieldType {
  Boolean = 'boolean',
  String = 'string',
  Text = 'text',
  Number = 'number',
  Enum = 'enum',
  Column = 'column',
  Table = 'table',
  Relation = 'relation',
  ModelFields = 'model_fields', // Dynamic field editor for model columns
  None = 'none'
}
