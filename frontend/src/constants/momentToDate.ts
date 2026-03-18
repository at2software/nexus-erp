import moment, { Moment } from "moment";
import tz from 'moment-timezone';

export const momentToDate = (_:Moment) => ({year: _.year(), month: _.month() + 1, day:_.day()})
export const dateToMoment = ({ year, month, day, hours = 0, minutes = 0, seconds = 0 } : any) => moment.tz([year, month - 1, day, hours, minutes, seconds], tz.tz.guess())

