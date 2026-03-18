export enum ObserverTrigger {
    Disabled    = 0,
    Always      = 1,
    OnCreated   = 2,
    OnUpdated   = 3,
    OnDeleted   = 4,
    Once        = 5,
    OnSchedule  = 6,
}

export const MODEL_BASED_TRIGGERS = [ObserverTrigger.OnCreated, ObserverTrigger.OnUpdated, ObserverTrigger.OnDeleted];
export const ALL_TRIGGERS: ObserverTrigger[] = Object.values(ObserverTrigger)
  .filter((v) => typeof v === 'number') as ObserverTrigger[];
