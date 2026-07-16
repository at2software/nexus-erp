import { ChangeDetectionStrategy, Component, inject, signal, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { VaultService } from '@models/vault.service';
import { ParamService } from '@models/param.service';
import { Toast } from '@shards/toast/toast';
import { NComponent } from '@shards/n/n.component';
import { Dictionary } from '@constants/constants';

interface TPipelineJob {
    job: string;
    artifact: string;
    type: 'sast' | 'npm' | 'composer' | 'cargo' | 'grype';
}
interface TVault {
    prefix: string;
    name: string;
    active: boolean;
    keys: Dictionary<string>;
    map: Dictionary<string>;
    missing?: string[];
}
interface TTanChallenge {
    challenge_id: string;
    type: 'tan' | 'phototan' | 'flickertan' | 'decoupled';
    text?: string;
    medium?: string;
    image?: string;
    svg?: string;
}

const VAULT_INFO: Dictionary<{ label: string; description: string }[]> = {
    MATTERMOST: [
        { label: 'URL', description: 'Mattermost server endpoint (e.g. https://mattermost.example.com)' },
        { label: 'team id', description: 'Numeric team ID — visible in Admin Console → Teams' },
        { label: 'team name', description: 'URL slug of the team (the part shown in the browser URL)' },
        { label: 'login', description: 'Username or email address of the bot account' },
        { label: 'password', description: 'Password of the bot account' },
        { label: 'broadcast channel', description: 'Channel ID used for system-wide notifications' },
        { label: 'default user ID', description: 'NEXUS user ID who receives direct payment notifications (e.g. discrepancies from bank reconciliation)' },
    ],
    AT2CONNECT: [{ label: 'URL', description: 'Base URL of the at²connect instance' }],
    GITLAB: [
        { label: 'GitLab URL', description: 'Base URL of your GitLab instance (e.g. https://gitlab.com)' },
        { label: 'access token', description: 'Personal or project access token — requires API scope' },
        { label: 'api key', description: 'Secret token configured in GitLab webhook settings for signature validation' },
    ],
    FINTS: [
        { label: 'FinTS server URL', description: 'HBCI/FinTS PIN/TAN URL of your bank. Enter your IBAN first to auto-fill. Full list at hbci-zka.de.' },
        { label: 'bank code (BLZ)', description: '8-digit German bank code — auto-filled from IBAN for DE accounts' },
        { label: 'account IBAN', description: 'IBAN of the account to monitor. Enter this first to auto-fill URL and BLZ.' },
        { label: 'login ID (Kennung)', description: 'Your online banking login ID (not the card PIN)' },
        { label: 'PIN', description: 'Your online banking PIN' },
    ],
};

const DEFAULT_PIPELINE_JOBS: TPipelineJob[] = [
    { job: 'semgrep-sast', artifact: 'gl-sast-report.json', type: 'sast' },
    { job: 'npm-audit', artifact: 'npm-audit.json', type: 'npm' },
    { job: 'composer audit', artifact: 'composer-audit.json', type: 'composer' },
    { job: 'cargo audit', artifact: 'cargo-audit.json', type: 'cargo' },
    { job: 'vuln_scan', artifact: 'grype-report.json', type: 'grype' },
];

@Component({
    selector: 'settings-connectors',
    imports: [FormsModule, NgbDropdownModule, NgbTooltipModule, NComponent],
    templateUrl: './settings-connectors.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsConnectorsComponent {
    vaults = signal<TVault[]>([]);
    currentVault = signal<TVault | undefined>(undefined);
    pipelineJobs = signal<TPipelineJob[]>([]);
    tanChallenge = signal<TTanChallenge | null>(null);
    tanInput = signal('');
    bankName = signal<string | null>(null);
    isPolling = signal(false);
    readonly jobPresets = DEFAULT_PIPELINE_JOBS;

    #vaultService = inject(VaultService);
    #paramService = inject(ParamService);
    #modalService = inject(NgbModal);

    constructor() {
        this.#vaultService.index().subscribe((response: TVault[]) => {
            response.forEach((vault) => {
                const map: Dictionary<string> = {};
                Object.keys(vault.keys).forEach((key) => (map[`${vault.prefix}_${key}`] = ''));
                vault.map = map;
            });
            this.vaults.set(response);
            if (response.some((v) => v.prefix === 'GITLAB')) this.#loadPipelineJobs();
        });
    }

    openVaultModal(vault: TVault, content: TemplateRef<unknown>) {
        this.currentVault.set(vault);
        this.tanChallenge.set(null);
        this.tanInput.set('');
        this.bankName.set(null);
        if (vault.prefix === 'GITLAB') this.#loadPipelineJobs();
        this.#modalService.open(content, { size: 'lg' });
    }

    checkCredentials() {
        this.#vaultService.update(this.currentVault()!.map).subscribe((response) => {
            if (response.success) {
                Toast.success('Connection test successful / Credentials saved');
                this.currentVault.update((v) => (v ? { ...v, active: true } : v));
            } else if (response.tan_required) {
                this.tanChallenge.set({ ...response.challenge, challenge_id: response.challenge_id });
                if (response.challenge?.type === 'decoupled') this.#startDecoupledPolling(response.challenge_id);
            }
        });
    }

    submitTan() {
        const challenge = this.tanChallenge()!;
        const vault = this.currentVault()!;
        this.#vaultService
            .submitTan({ prefix: vault.prefix, challenge_id: challenge.challenge_id, tan: this.tanInput() || undefined })
            .subscribe((response) => {
                if (response.success) {
                    Toast.success('Authentication successful / Credentials saved');
                    this.tanChallenge.set(null);
                    this.tanInput.set('');
                    this.currentVault.update((v) => (v ? { ...v, active: true } : v));
                }
                // waiting=true for decoupled is handled by the polling loop
            });
    }

    cancelTan() {
        this.isPolling.set(false);
        this.tanChallenge.set(null);
        this.tanInput.set('');
    }

    onVaultFieldChange(key: string, value: string) {
        this.updateVaultMapKey(key, value);
        if (key === 'FINTS_IBAN') this.#onIbanChange(value);
    }

    savePipelineJobs() {
        this.#paramService.update('params/SETTINGS_GIT_PIPELINE', { value: JSON.stringify(this.pipelineJobs()) }).subscribe(() => {
            Toast.success('Pipeline settings saved');
        });
    }

    addPipelineJob(preset: TPipelineJob) {
        this.pipelineJobs.update((jobs) => [...jobs, { ...preset }]);
    }

    removePipelineJob(i: number) {
        this.pipelineJobs.update((jobs) => jobs.filter((_, idx) => idx !== i));
    }

    updatePipelineJob(i: number, field: 'job' | 'artifact', value: string) {
        this.pipelineJobs.update((jobs) => jobs.map((j, idx) => (idx === i ? { ...j, [field]: value } : j)));
    }

    updateVaultMapKey(key: string, value: string) {
        this.currentVault.update((v) => (v ? { ...v, map: { ...v.map, [key]: value } } : v));
    }

    infoFor = (vault: TVault) => VAULT_INFO[vault.prefix] ?? [];
    keysFor = (vault: TVault) => Object.keys(vault.keys);
    mapKey = (key: string) => this.currentVault()!.prefix + '_' + key;
    isKeyMissing = (key: string) => this.currentVault()?.missing?.includes(key) ?? false;
    vaultIcon = (vault: TVault) =>
        ({ MATTERMOST: 'mattermost', GITLAB: 'git', AT2CONNECT: 'nexus', FINTS: 'bank' }[vault.prefix] ?? vault.prefix.toLowerCase());

    #onIbanChange(iban: string) {
        const normalized = iban.replace(/\s/g, '').toUpperCase();
        if (normalized.startsWith('DE') && normalized.length >= 12) {
            const blz = normalized.substring(4, 12);
            this.updateVaultMapKey('FINTS_BLZ', blz);
            this.#vaultService.bankLookup(blz).subscribe((info) => {
                if (info?.url) this.updateVaultMapKey('FINTS_URL', info.url);
                this.bankName.set(info?.name ?? null);
            });
        } else {
            this.bankName.set(null);
        }
    }

    #startDecoupledPolling(challengeId: string) {
        this.isPolling.set(true);
        const poll = () => {
            if (!this.isPolling()) return;
            this.#vaultService
                .submitTan({ prefix: this.currentVault()!.prefix, challenge_id: challengeId })
                .subscribe((response) => {
                    if (response.success) {
                        this.isPolling.set(false);
                        this.tanChallenge.set(null);
                        this.currentVault.update((v) => (v ? { ...v, active: true } : v));
                        Toast.success('Authentication successful / Credentials saved');
                    } else if (response.waiting && this.isPolling()) {
                        setTimeout(poll, 3000);
                    }
                });
        };
        setTimeout(poll, 3000);
    }

    #loadPipelineJobs() {
        this.#paramService.show('params/SETTINGS_GIT_PIPELINE').subscribe({
            next: (param) => {
                try {
                    const parsed = JSON.parse(param.value as string);
                    this.pipelineJobs.set(Array.isArray(parsed) ? parsed : [...DEFAULT_PIPELINE_JOBS]);
                } catch {
                    this.pipelineJobs.set([...DEFAULT_PIPELINE_JOBS]);
                }
            },
            error: () => this.pipelineJobs.set([...DEFAULT_PIPELINE_JOBS]),
        });
    }
}
