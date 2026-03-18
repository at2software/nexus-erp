import { Injectable } from "@angular/core";
import { NexusHttpService } from "../http/http.nexus";
import { Encryption } from "src/models/encryption/encryption.model";

@Injectable({ providedIn: 'root' })
export class EncryptionService extends NexusHttpService<any> {
    public apiPath = 'encryptions'
    public TYPE = () => Encryption
}