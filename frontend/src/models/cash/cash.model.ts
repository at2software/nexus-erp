import { Serializable } from "../serializable";
import { CashService } from "./cash.servcie";
import { NxAction } from "src/app/nx/nx.actions";
import { Observable } from "rxjs";
import { getCashActions } from "./cash.actions";

export class Cash extends Serializable {
    SERVICE = CashService;
    static API_PATH = (): string => 'cashes'

    description:string
    approver:string
    occured_at:string
    value:number

    actions:NxAction[] = getCashActions(this)
        
    delete():Observable<any> {
        return this.httpService.delete('cash/entries/' + this.id)
    }
}