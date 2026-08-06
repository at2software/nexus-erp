export enum Recurrence {
    None = 0,
    Daily = 1,
    Weekly = 4,
    EveryTwoWeeks = 5,
    Monthly = 2,
    EveryTwoMonths = 6,
    EveryThreeMonths = 7,
    EverySixMonths = 8,
    Yearly = 3,
}

export interface RecurrenceOption {
    value: Recurrence;
    days: number;
    label: string;
    short: string;
}

export const RECURRENCES: readonly RecurrenceOption[] = [
    { value: Recurrence.None,             days: 0,   short: '--', label: $localize`:@@i18n.common.none:none` },
    { value: Recurrence.Daily,            days: 1,   short: '1D', label: $localize`:@@i18n.common.daily:daily` },
    { value: Recurrence.Weekly,           days: 7,   short: '1W', label: $localize`:@@i18n.common.weekly:weekly` },
    { value: Recurrence.EveryTwoWeeks,    days: 14,  short: '2W', label: $localize`:@@i18n.marketing.everyTwoWeeks:every two weeks` },
    { value: Recurrence.Monthly,          days: 30,  short: '1M', label: $localize`:@@i18n.common.monthly:monthly` },
    { value: Recurrence.EveryTwoMonths,   days: 60,  short: '2M', label: $localize`:@@i18n.marketing.everyTwoMonths:every two months` },
    { value: Recurrence.EveryThreeMonths, days: 90,  short: '3M', label: $localize`:@@i18n.marketing.everyThreeMonths:every three months` },
    { value: Recurrence.EverySixMonths,   days: 180, short: '6M', label: $localize`:@@i18n.marketing.everySixMonths:every six months` },
    { value: Recurrence.Yearly,           days: 360, short: '1Y', label: $localize`:@@i18n.common.yearly:yearly` },
];

export const REPEATING_RECURRENCES: readonly RecurrenceOption[] = RECURRENCES.filter((_) => _.value !== Recurrence.None);

export const recurrenceOf = (value?: Recurrence | number | string | null): RecurrenceOption => RECURRENCES.find((_) => _.value === +(value ?? 0)) ?? RECURRENCES[0];
