import { Service } from '@angular/core';
import { NgbDateAdapter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { dayjs } from '@constants/date/dates';

function isInteger(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
}

@Service({ autoProvided: false })
export class NgbDateUnixAdapter extends NgbDateAdapter<string> {
    public fromModel(dateString: string): NgbDateStruct | null {
        if (!dateString || typeof dateString !== 'string') return null;
        const _ = dayjs.unix(parseInt(dateString));
        return { year: _.year(), month: _.month(), day: _.date() };
    }

    public toModel(date: NgbDateStruct): string | null {
        if (date && isInteger(date.year) && isInteger(date.month) && isInteger(date.day)) {
            return '' + dayjs(date.year + '-' + date.month + '-' + date.day, 'YYYY-MM-DD').unix();
        }
        return null;
    }
}
