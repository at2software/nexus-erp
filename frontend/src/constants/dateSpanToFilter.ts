import { Moment } from 'moment';

export const dateSpanToFilter = (a: { startDate: Moment, endDate: Moment }): Record<string, string> => ({ startDate: a.startDate.format('DD.MM.YYYY'), endDate: a.endDate.format('DD.MM.YYYY') })