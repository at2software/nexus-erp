import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { forkJoin, switchMap, tap } from 'rxjs';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { GitlabAuditService } from '@models/gitlab-audit/gitlab-audit.service';
import { NComponent } from '@app/_shards/n/n.component';
import { SearchInputComponent } from '@app/_shards/search-input/search-input.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

const NEXUS_PREFIX = '[NEXUS] ';

const CRON_PRESETS = [
    { label: $localize`:@@i18n.common.daily:daily`, cron: '0 0 * * *' },
    { label: $localize`:@@i18n.common.weekly:weekly`, cron: '0 0 * * 0' },
    { label: $localize`:@@i18n.common.monthly:monthly`, cron: '0 0 1 * *' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-audit-pipeline',
    standalone: true,
    imports: [FormsModule, NComponent, SearchInputComponent, SpinnerComponent],
    templateUrl: './modal-audit-pipeline.component.html',
})
export class ModalAuditPipelineComponent {
    projectUrl = '';
    selectedCompany?: any;
    checking = signal(false);
    creating = signal(false);
    error = '';
    checkedProject: any = null;
    stages: string[] = [];
    selectedStages: Record<string, boolean> = {};
    branch = 'main';
    selectedCron = CRON_PRESETS[1].cron;
    customCron = '';
    isCustomCron = false;
    readonly cronPresets = CRON_PRESETS;

    activeModal = inject(NgbActiveModal);
    #http = inject(HttpClient);
    #factory = inject(PluginInstanceFactory);
    #service = inject(GitlabAuditService);

    get #enc() {
        return this.#factory.getPluginEncryptionsOfType('git').find((e) => this.projectUrl.startsWith(e.value.url));
    }

    check() {
        this.error = '';
        this.checkedProject = null;
        this.stages = [];
        const enc = this.#enc;
        if (!enc) {
            this.error = 'No GitLab token found for this URL.';
            return;
        }
        const path = encodeURIComponent(this.projectUrl.slice(enc.value.url.length).replace(/\/$/, ''));
        const base = enc.value.url + 'api/v4/';
        this.checking.set(true);
        this.#http
            .get<any>(`${base}projects/${path}`)
            .pipe(
                tap((project) => {
                    this.checkedProject = project;
                    this.branch = project.default_branch ?? 'main';
                }),
                switchMap((project) =>
                    this.#http.get(`${base}projects/${project.id}/repository/files/.gitlab-ci.yml/raw`, {
                        responseType: 'text',
                        params: { ref: this.branch },
                    }),
                ),
            )
            .subscribe({
                next: (yaml) => {
                    this.stages = this.#parseJobs(yaml as string);
                    this.selectedStages = Object.fromEntries(this.stages.map((s) => [s, true]));
                    this.checking.set(false);
                },
                error: () => {
                    this.error = this.checkedProject ? 'Could not fetch .gitlab-ci.yml — check the repository has one.' : 'Project not found or access denied.';
                    this.checking.set(false);
                },
            });
    }

    #parseJobs(yaml: string): string[] {
        const reserved = new Set(['stages', 'variables', 'include', 'default', 'workflow', 'image', 'services', 'cache', 'before_script', 'after_script']);
        return yaml
            .split('\n')
            .map((l) => l.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*$/))
            .filter((m): m is RegExpMatchArray => !!m && !reserved.has(m[1]))
            .map((m) => m[1]);
    }

    get cron() {
        return this.isCustomCron ? this.customCron : this.selectedCron;
    }
    get selectedList() {
        return this.stages.filter((s) => this.selectedStages[s]);
    }
    get canCreate() {
        return !!(this.checkedProject && this.selectedList.length && this.cron);
    }

    create() {
        if (!this.canCreate) return;
        const enc = this.#enc!;
        const base = enc.value.url + 'api/v4/';
        const id = this.checkedProject.id;
        const cron = this.cron;
        const ref = this.branch;
        this.creating.set(true);
        forkJoin(
            this.selectedList.map((stage) =>
                this.#http.post(`${base}projects/${id}/pipeline_schedules`, {
                    description: NEXUS_PREFIX + stage,
                    ref,
                    cron,
                    active: true,
                }),
            ),
        )
            .pipe(
                switchMap(() =>
                    this.#service.post('gitlab-audit', {
                        gitlab_url: enc.value.url,
                        namespace_with_path: this.checkedProject.path_with_namespace,
                        project_name: this.checkedProject.name,
                        gitlab_project_id: this.checkedProject.id,
                        company_id: this.selectedCompany?.id ?? null,
                    }),
                ),
            )
            .subscribe({
                next: () => {
                    this.creating.set(false);
                    this.activeModal.close(true);
                },
                error: () => {
                    this.creating.set(false);
                },
            });
    }
}
