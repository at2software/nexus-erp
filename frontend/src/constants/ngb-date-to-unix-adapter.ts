/** Outer dependencies */
import { Injectable } from '@angular/core';
import { NgbDateAdapter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';

function isInteger(value: any): value is number { return typeof value === 'number' && isFinite(value) && Math.floor(value) === value; }

@Injectable()
export class NgbDateUnixAdapter extends NgbDateAdapter<string> {

    public fromModel(dateString: string): NgbDateStruct | null {
        if (!dateString || typeof dateString !== 'string') return null
        const _ = moment.unix(parseInt(dateString))
        const a = { year: _.year(), month: _.month(), day: _.date() }
        return a
    }

    public toModel(date: NgbDateStruct): string | null {
        if (date && isInteger(date.year) && isInteger(date.month) && isInteger(date.day)) {
            return "" + moment(date.year + '-' + date.month + '-' + date.day, 'YYYY-MM-DD').unix()
        }
        return null;
    }
}
