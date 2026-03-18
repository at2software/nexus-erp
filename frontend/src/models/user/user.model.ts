import { UserService } from "src/models/user/user.service"
import { VcardClass } from "../vcard/VcardClass"
import { environment } from "src/environments/environment"
import type { Vacation } from "../vacation/vacation.model"
import { UserEmployment } from "./user-employment.model"
import { Encryption } from "../encryption/encryption.model"
import * as forge from 'node-forge';
import { NxAction } from "src/app/nx/nx.actions"
import { ReplaySubject } from "rxjs"
import { REFLECTION } from "src/constants/constants"
import { T_ASSIGNEE_TARGET } from "../assignee/assignee.model"
import { AutoWrap, AutoWrapArray } from "@constants/autowrap"
import type { Company } from "@models/company/company.model"
import { Project } from "@models/project/project.model"
import { Accessor, AccessorArray } from "@constants/accessor"
import { getUserActions } from "./user.actions"

export class User extends VcardClass {

	static API_PATH = ():string => 'users'
    static iconPathFor = (user_id:string) => environment.envApi + `users/${user_id}/icon`
    static COOKIE_ENC_KEY = 'ENC_PEM'

    SERVICE = UserService

    encryptionInitialized = new ReplaySubject<boolean>()
    api_token             : string                     = ''
    email                 : string                     = ''
    is_retired            : boolean                    = false
    public_key            : string|null                = null
    private_key           : string|null                = null
    keyPair               : forge.pki.rsa.KeyPair|null = null
    savesEncryptionCookie : boolean                    = false
    encryptions           : Encryption[] = []
    is_sick              ?: string
    is_on_vacation       ?: string
    color                 : string                     = '#000000'
    work_zip             ?: number
    role_names           : string[]                   = []
    latest_foci?:{id:string, parent_path:string, parent_name:string}[]

    @AutoWrap('UserEmployment') active_employment: UserEmployment
    @AutoWrapArray('UserEmployment') employments      : UserEmployment[]
    @AutoWrapArray('Vacation') approvedVacations      : Vacation[]
    @AutoWrapArray('Vacation') currentSickNotes       : Vacation[]
        
    @Accessor(REFLECTION) current_focus:Company|Project
    @AccessorArray(REFLECTION) active_projects:T_ASSIGNEE_TARGET[]

    actions:NxAction[] = getUserActions(this)

    serialize (json: any) {
        super.serialize(json)
        this.colorCss = this.color
        if (json?.id) {
            this.icon = `users/${json.id}/icon`
        }
    }

    avatar = () => this.icon

    getHpwArray          = () => this.active_employment?.hpwArray() ?? [0, 0, 0, 0, 0, 0, 0]
    getHpwWithKeys       = () => Object.assign({}, ...['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'].map((_:string, i:number) => ({[_]: this.getHpwArray()[i]})))
    getHpw               = () => this.getHpwArray().reduce((a, b) => a + b)
    getWorkingDaysAmount = () => this.getHpwArray().filter((_) => _ > 0).length
    getAverageHpd        = () => this.getHpw() / this.getWorkingDaysAmount()

    hasRole = (roleName: string): boolean => {
        // Admin has all permissions
        if (roleName !== 'admin' && this.role_names.includes('admin')) {
            return true
        }
        return this.role_names.includes(roleName)
    }

    hasAnyRole = (roles: string[]): boolean => {
        // Admin has all permissions
        if (this.role_names.includes('admin')) {
            return true
        }
        return roles.some(role => this.role_names.includes(role))
    }

    // encryption
    initRsaEncryption() {
        const pem = localStorage.getItem(User.COOKIE_ENC_KEY)
        if (pem && pem.length) {
            this.importFromPem(pem, true)
        } else {
            this.encryptionInitialized.next(true)
        }
    }
    importFromPem(pem:string, toggleSave = false) {
        try {
            const decrypted = forge.pki.privateKeyFromPem(pem)
            if (decrypted) {
                if (toggleSave) this.savesEncryptionCookie = true
                this.#assignRsaKeyPair(this.toKeyPair(decrypted))
            } 
        } catch (_x:any) {
            window.alert("invalid PEM key")
            this.#deleteEncryptionCookie()
        } finally {
            this.encryptionInitialized.next(true)
        }
    }
    toKeyPair = (_:forge.pki.rsa.PrivateKey) => ({ privateKey: _, publicKey: forge.pki.rsa.setPublicKey(_.n, _.e)})
    #assignRsaKeyPair(_:forge.pki.rsa.KeyPair) {
        this.keyPair = _
        this.public_key = forge.pki.publicKeyToPem(_.publicKey)
        this.private_key = forge.pki.privateKeyToPem(_.privateKey)
    }
    async createRsaKeyPair () {
        const keypair = await Encryption.createRsaKeypair()
        this.#assignRsaKeyPair(keypair)
    }
    toggleEncryptionCookie = () => !this.savesEncryptionCookie ? this.#saveEncryptionCookie() : this.#deleteEncryptionCookie()
    #saveEncryptionCookie() {
        if (this.private_key) {
            this.savesEncryptionCookie = true
            localStorage.setItem(User.COOKIE_ENC_KEY, this.private_key!)
        }
    }
    addEncryption(key:string, value:any) {
        if (this.keyPair) {
            const enc = Encryption.fromJson()
            enc.key = key
            enc.value = this.keyPair.publicKey.encrypt(value)
            //enc.path = this.getApiPathWithId()
            enc.store().subscribe()
        }
    }
    #deleteEncryptionCookie() {
        if (this.savesEncryptionCookie) {
            this.savesEncryptionCookie = false
            localStorage.removeItem(User.COOKIE_ENC_KEY)
        }
    }

}