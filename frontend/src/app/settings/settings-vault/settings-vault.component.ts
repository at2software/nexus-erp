
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { VaultService } from '@models/vault.service';
import { ParamService } from '@models/param.service';
import { Toast } from '@shards/toast/toast';

type TDict = Record<string, string>
interface TPipelineJob { job: string, artifact: string, type: 'sast' | 'npm' | 'composer' | 'cargo' }
interface TVault { prefix:string, name:string, active:boolean, keys: TDict, map: TDict, missing?: string[] }

const VAULT_INFO: Record<string, { label: string, description: string }[]> = {
    MATTERMOST: [
        { label: 'URL',                description: 'Mattermost server endpoint (e.g. https://mattermost.example.com)' },
        { label: 'team id',            description: 'Numeric team ID — visible in Admin Console → Teams' },
        { label: 'team name',          description: 'URL slug of the team (the part shown in the browser URL)' },
        { label: 'login',              description: 'Username or email address of the bot account' },
        { label: 'password',           description: 'Password of the bot account' },
        { label: 'broadcast channel',  description: 'Channel ID used for system-wide notifications' },
    ],
    AT2CONNECT: [
        { label: 'URL', description: 'Base URL of the at²connect instance' },
    ],
    GITLAB: [
        { label: 'GitLab URL',    description: 'Base URL of your GitLab instance (e.g. https://gitlab.com)' },
        { label: 'access token',  description: 'Personal or project access token — requires API scope' },
        { label: 'api key',       description: 'Secret token configured in GitLab webhook settings for signature validation' },
    ],
}

const DEFAULT_PIPELINE_JOBS: TPipelineJob[] = [
    { job: 'semgrep-sast',   artifact: 'gl-sast-report.json',  type: 'sast'     },
    { job: 'npm-audit',      artifact: 'npm-audit.json',        type: 'npm'      },
    { job: 'composer audit', artifact: 'composer-audit.json',   type: 'composer' },
    { job: 'cargo audit',    artifact: 'cargo-audit.json',      type: 'cargo'    },
]

@Component({
  selector: 'settings-vault',
  imports: [FormsModule, NgbDropdownModule, NgbTooltipModule],
  templateUrl: './settings-vault.component.html',
  styleUrl: './settings-vault.component.scss'
})
export class SettingsVaultComponent implements OnInit {

    vaults: TVault[] = []
    currentVault?: TVault
    pipelineJobs: TPipelineJob[] = []
    readonly jobPresets = DEFAULT_PIPELINE_JOBS

    vaultService  = inject(VaultService)
    #paramService = inject(ParamService)

    ngOnInit() {
        this.vaultService.index().subscribe((response: TVault[]) => {
            response.forEach(vault => {
                const map: TDict = {}
                Object.keys(vault.keys).forEach(key => map[`${vault.prefix}_${key}`] = '')
                vault.map = map
            })
            this.vaults = response
            const first = response.first()
            if (first) this.selectVault(first)
        })
    }

    selectVault(vault: TVault) {
        this.currentVault = vault
        if (vault.prefix === 'GITLAB') {
            this.#loadPipelineJobs()
        }
    }

    checkCredentials() {
        this.vaultService.update(this.currentVault!.map).subscribe(response => {
            if (response.success) {
                Toast.success('Connection test successful / Credentials saved')
                this.currentVault!.active = true
            }
        })
    }

    savePipelineJobs() {
        this.#paramService.update('params/SETTINGS_GIT_PIPELINE', { value: JSON.stringify(this.pipelineJobs) }).subscribe(() => {
            Toast.success('Pipeline settings saved')
        })
    }

    addPipelineJob(preset: TPipelineJob) { this.pipelineJobs.push({ ...preset }) }
    removePipelineJob(i: number)  { this.pipelineJobs.splice(i, 1) }

    infoFor = (vault: TVault) => VAULT_INFO[vault.prefix] ?? []

    keysFor    = (vault: TVault) => Object.keys(vault.keys)
    mapKey     = (key: string) => this.currentVault!.prefix + '_' + key
    isKeyMissing = (key: string) => this.currentVault?.missing?.includes(key) ?? false

    #loadPipelineJobs() {
        this.#paramService.show('params/SETTINGS_GIT_PIPELINE').subscribe({
            next: param => {
                try {
                    const parsed = JSON.parse(param.value as string)
                    this.pipelineJobs = Array.isArray(parsed) ? parsed : [...DEFAULT_PIPELINE_JOBS]
                } catch {
                    this.pipelineJobs = [...DEFAULT_PIPELINE_JOBS]
                }
            },
            error: () => this.pipelineJobs = [...DEFAULT_PIPELINE_JOBS],
        })
    }
}
