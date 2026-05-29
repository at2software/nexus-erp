import { NxAction } from '@app/nx/nx.actions';
import { Serializable } from '../serializable';
import { NexusHttpService } from '@models/http/http.nexus';
import * as forge from 'node-forge';
import { NxGlobal } from '@app/nx/nx.global';
import { getEncryptisingleActionResolveds } from './encryption.actions';
import { Model } from '@constants/type-discriminators';

@Model('Encryption')
export class Encryption extends Serializable {
    static API_PATH = (): string => 'encryptions';
    SERVICE = NexusHttpService<any>;

    key: string = '';
    my_id?: string;

    /** Encrypted string received from the API, stored as-is. */
    #encryptedValue: any;
    /** Returns the decrypted value on demand — no lifecycle hook needed. */
    get value(): any {
        if (!this.#encryptedValue || !NxGlobal.global.user?.keyPair) return undefined;
        try {
            return JSON.parse(NxGlobal.global.user.keyPair.privateKey.decrypt(this.#encryptedValue));
        } catch {
            return undefined;
        }
    }
    set value(v: any) { this.#encryptedValue = v; }

    actions: NxAction[] = getEncryptisingleActionResolveds(this);

    getMyIdKey = () => 'MY_' + this.key + '_' + this.value.url.replace(/(^https?:\/\/|\/|\\)/i, '');

    loadJson(x: any) {
        this.fromJson(x);
        return this;
    }

    // ************** parent overrides **************
    override dirtyFields(): any {
        const changes = super.dirtyFields();
        if ('value' in changes && NxGlobal.global.user!.keyPair) {
            changes['value'] = NxGlobal.global.user!.keyPair.publicKey.encrypt(JSON.stringify(changes['value']));
        }
        return changes;
    }
    protected updateMyself = (x: any) => this.loadJson(x);

    // New RSA encryption - async with callback for non-blocking generation
    static createRsaKeypair = (): Promise<forge.pki.rsa.KeyPair> => {
        return new Promise((resolve, reject) => {
            forge.pki.rsa.generateKeyPair({ bits: 4096, workers: -1 }, (err, keypair) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(keypair);
                }
            });
        });
    };
}
