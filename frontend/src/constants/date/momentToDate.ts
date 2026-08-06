import { dayjs, Dayjs } from '@constants/date/dates';

export const momentToDate = (_: Dayjs) => ({ year: _.year(), month: _.month() + 1, day: _.day() });
const pad = (_: number): string => String(_).padStart(2, '0');

export const dateToMoment = ({ year, month, day, hours = 0, minutes = 0, seconds = 0 }: { year: number; month: number; day: number; hours?: number; minutes?: number; seconds?: number }) =>
	dayjs.tz(`${year}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, 'YYYY-MM-DD HH:mm:ss', dayjs.tz.guess());
