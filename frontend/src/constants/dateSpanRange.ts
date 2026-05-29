import moment from 'moment';

const now = moment();
export const DATESPAN_RANGE = {
    'Last 7 Days': [now.clone().subtract(6, 'days'), now.clone()],
    'Last 30 Days': [now.clone().subtract(29, 'days'), now.clone()],
    'This Month': [now.clone().startOf('month'), now.clone().endOf('month')],
    'Last Month': [now.clone().subtract(1, 'month').startOf('month'), now.clone().subtract(1, 'month').endOf('month')],
    'This year': [now.clone().startOf('year'), now.clone().endOf('year')],
    'Last year': [now.clone().subtract(1, 'year').startOf('year'), now.clone().subtract(1, 'year').endOf('year')],
};
