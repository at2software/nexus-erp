import { dayjs, Dayjs } from '@constants/dates';
import { Dictionary } from './constants';

const now = dayjs();
export const DATESPAN_RANGE: Dictionary<[Dayjs, Dayjs]> = {
    'Last 7 Days': [now.subtract(6, 'days'), now],
    'Last 30 Days': [now.subtract(29, 'days'), now],
    'This Month': [now.startOf('month'), now.endOf('month')],
    'Last Month': [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')],
    'This year': [now.startOf('year'), now.endOf('year')],
    'Last year': [now.subtract(1, 'year').startOf('year'), now.subtract(1, 'year').endOf('year')],
};
