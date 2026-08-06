import { Service } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { Encryption } from '@models/encryption/encryption.model';

@Service()
export class EncryptionService extends NexusHttpService<Encryption> {
    public apiPath = 'encryptions';
    override readonly model = Encryption;
}
