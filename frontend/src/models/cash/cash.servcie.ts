import { Injectable } from "@angular/core";
import { NexusHttpService } from "../http/http.nexus";
import { Cash } from "./cash.model";
import { CashRegister } from "./cash.register.model";

@Injectable({ providedIn: 'root' })
export class CashService extends NexusHttpService<CashRegister> {
    public apiPath = 'cash'
    indexRegisters = () => this.aget('cash', {}, CashRegister)
    indexEntries = (_:string) => this.aget(`cash/${_}`, {}, Cash)
    storeEntry = (id:string, data:any) => this.post(`cash/${id}`, data)
}