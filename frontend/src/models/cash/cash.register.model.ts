import { Serializable } from "../serializable";
import { CashService } from "./cash.servcie";

export class CashRegister extends Serializable {
    SERVICE = CashService;
    static API_PATH = (): string => 'cash_registers'

    name:string
    
}