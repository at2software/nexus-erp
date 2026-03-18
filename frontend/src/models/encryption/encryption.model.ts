import { NxAction } from "src/app/nx/nx.actions";
import { Serializable } from "../serializable";
import { NexusHttpService } from "src/models/http/http.nexus";
import * as forge from 'node-forge';
import { NxGlobal } from "src/app/nx/nx.global";
import { getEncryptisingleActionResolveds } from "./encryption.actions";

export class Encryption extends Serializable {

    static API_PATH = (): string => 'encryptions'
    SERVICE = NexusHttpService<any>

    key   : string
    value : any | undefined
    my_id?: string

    actions: NxAction[] = getEncryptisingleActionResolveds(this)

    snapshotNonPrimitives = () => ['value']
    getMyIdKey = () => 'MY_' + this.key + '_' + this.value.url.replace(/(^https?:\/\/|\/|\\)/i, '')
    
    // Override serialize to handle decryption
    serialize = (json?: any) => {
        if (json && NxGlobal.global.user!.keyPair) {
            try {
                this.value = JSON.parse(NxGlobal.global.user!.keyPair.privateKey.decrypt(json.value))
            } catch (_ex: any) {
                this.value = undefined
            }
        }
    }

    loadJson(x: any) {
        if (NxGlobal.global.user!.keyPair) {
            try {
                x.value = JSON.parse(NxGlobal.global.user!.keyPair.privateKey.decrypt(x.value))
            } catch (_ex: any) {
                x.value = undefined
            }
        }
        this._serialize(x)
        return this
    }

    // ************** parent overrides **************
    protected override snapshotDiff = () => {
        const changes = this._snapshotDiff()
        if ('value' in changes && NxGlobal.global.user!.keyPair) {
            changes['value'] = NxGlobal.global.user!.keyPair.publicKey.encrypt(JSON.stringify(changes['value']))
        }
        return changes
    }
    protected updateMyself = (x: any) => this.loadJson(x)


    // New RSA encryption - async with callback for non-blocking generation
    static createRsaKeypair = (): Promise<forge.pki.rsa.KeyPair> => {
        return new Promise((resolve, reject) => {
            forge.pki.rsa.generateKeyPair({ bits: 4096, workers: -1 }, (err, keypair) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(keypair)
                }
            })
        })
    }

}