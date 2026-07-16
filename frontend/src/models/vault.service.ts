import { Injectable } from '@angular/core';
import { NexusHttpService } from './http/http.nexus';
import { Dictionary } from '@constants/constants';
import { BankLookupResponse } from './api-response';

@Injectable({ providedIn: 'root' })
export class VaultService extends NexusHttpService<any> {
    apiPath = 'vault';

    index = (filters?: Dictionary) => this.aget('vaults', filters);
    update = (credentials: Dictionary) => this.post('vaults', credentials);
    submitTan = (data: { prefix: string; challenge_id: string; tan?: string }) => this.post('vaults/tan', data);
    bankLookup = (blz: string) => this.get<BankLookupResponse>('vaults/bank-lookup', { blz });
}
