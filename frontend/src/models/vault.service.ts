import { Service } from '@angular/core';
import { NexusHttpService } from './http/http.nexus';
import { Dictionary } from '@constants/constants';
import { BankLookupDto } from '@models/_core/api-response';
import { Vault } from './vault.model';

@Service()
export class VaultService extends NexusHttpService<Vault> {
    apiPath = 'vault';

    index = (filters?: Dictionary) => this.aget('vaults', filters, Vault);
    checkCredentials = (credentials: Dictionary) => this.post('vaults', credentials, Object);
    submitTan = (data: { prefix: string; challenge_id: string; tan?: string }) => this.post('vaults/tan', data, Object);
    bankLookup = (blz: string) => this.get<BankLookupDto>('vaults/bank-lookup', { blz });
}
