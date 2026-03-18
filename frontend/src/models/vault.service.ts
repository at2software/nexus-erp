import { Injectable } from "@angular/core"
import { NexusHttpService } from "./http/http.nexus"
import { Dictionary } from "@constants/constants"

@Injectable({ providedIn: 'root' })
export class VaultService extends NexusHttpService<any> {
    apiPath = 'vault'
    TYPE = () => Object
    index = (filters?: Dictionary) => this.aget('vaults', filters)
    update = (credentials:Dictionary) => this.post('vaults', credentials)
}