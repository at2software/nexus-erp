import { Injectable } from "@angular/core";
import { NgbDateAdapter, NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";

@Injectable()
export class NgbDateCarbonAdapter extends NgbDateAdapter<string> {

  readonly DELIMITER = '-';

  fromModel(value: string | null): NgbDateStruct | null {
    if (value) {
      const date = value.split(this.DELIMITER);
      return {
        day : parseInt(date[2], 10),
        month : parseInt(date[1], 10),
        year : parseInt(date[0], 10)
      };
    }
    return null;
  }

  toModel(date: NgbDateStruct | null): string | null {
    return date ? date.year + this.DELIMITER + date.month + this.DELIMITER + date.day : null;
  }
}