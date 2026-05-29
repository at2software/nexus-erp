import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { SearchInputComponent } from '@app/_shards/search-input/search-input.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { GitlabAuditService } from '@models/gitlab-audit/gitlab-audit.service';
import { GitlabAuditProject } from '@models/gitlab-audit/gitlab-audit-project.model';
import { GitlabSchedule } from '@models/gitlab-audit/gitlab-schedule.model';
import { Company } from '@models/company/company.model';
import { ProductService } from '@models/product/product.service';
import { ParamService } from '@models/param.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalAuditPipelineComponent } from '@app/_modals/modal-audit-pipeline/modal-audit-pipeline.component';
import { ModalSearchComponent } from '@app/_modals/modal-search/modal-search.component';
import { ModalSelectInvoiceItemComponent } from '@app/_modals/modal-select-invoice-item/modal-select-invoice-item.component';
import { ModalCreateAuditInvoiceItemComponent } from '@app/_modals/modal-create-audit-invoice-item/modal-create-audit-invoice-item.component';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { Product } from '@models/product/product.model';

const NEXUS_PREFIX = '[NEXUS] ';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-audit',
    standalone: true,
    imports: [RouterModule, ToolbarComponent, EmptyStateComponent, AvatarComponent, SearchInputComponent, NgbTooltipModule, Nx, NComponent, AvatarComponent, SpinnerComponent],
    templateUrl: './projects-audit.component.html',
})
export class ProjectsAuditComponent implements OnInit {
    projects = signal<GitlabAuditProject[]>([]);
    loading = signal(true);

    defaultProduct = signal<Product|undefined>(undefined);
    savingProduct = signal(false);

    #service = inject(GitlabAuditService);
    #factory = inject(PluginInstanceFactory);
    #http = inject(HttpClient);
    #modalBase = inject(ModalBaseService);
    #inputModal = inject(InputModalService);
    #ngbModal = inject(NgbModal);
    #productService = inject(ProductService);
    #paramService = inject(ParamService);

    ngOnInit() {
        this.load();
        this.loadDefaultProduct();
    }

    load() {
        this.loading.set(true);
        this.#service.index().subscribe({
            next: (projects) => {
                this.projects.set(projects);
                this.loading.set(false);
                this.projects().forEach((p) => this.#bindCallbacks(p));
                this.loadSchedules();
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    loadDefaultProduct() {
        this.#paramService.show('params/AUDIT_DEFAULT_PRODUCT_ID').subscribe({
            next: (param: any) => {
                const id = param?.value;
                if (!id) return;
                this.#productService.show(String(id)).subscribe({
                    next: (product: any) => {
                        this.defaultProduct.set(product);
                    },
                });
            },
        });
    }

    selectDefaultProduct(product: any) {
        this.defaultProduct.set(product);
        this.savingProduct.set(true);
        this.#paramService.update('params/AUDIT_DEFAULT_PRODUCT_ID', { value: product.id }).subscribe({
            next: () => {
                this.savingProduct.set(false);
            },
            error: () => {
                this.savingProduct.set(false);
            },
        });
    }

    clearDefaultProduct() {
        this.defaultProduct.set(undefined);
        this.#paramService.update('params/AUDIT_DEFAULT_PRODUCT_ID', { value: null }).subscribe();
    }

    #enc(project: GitlabAuditProject) {
        return this.#factory.getPluginEncryptionsOfType('git').find((e) => project.gitlab_url.startsWith(e.value.url));
    }

    loadSchedules() {
        const projects = this.projects();
        projects.forEach((p) => {
            const enc = this.#enc(p);
            if (!enc) {
                p.var.noToken = true;
                return;
            }
            p.var.loading = true;
            const encoded = encodeURIComponent(p.namespace_with_path);
            this.#http
                .get<any[]>(`${enc.value.url}api/v4/projects/${encoded}/pipeline_schedules`)
                .pipe(catchError(() => of([])))
                .subscribe((raw) => {
                    p.schedules = (raw ?? []).filter((s: any) => s.description?.startsWith(NEXUS_PREFIX)).map((s: any) => this.#makeSchedule(s, p));
                    p.var.loading = false;
                });
        });
    }

    #makeSchedule(raw: any, project: GitlabAuditProject): GitlabSchedule {
        const s = GitlabSchedule.fromApi(raw);
        s.var.onDelete = (schedule: GitlabSchedule, done?: () => void) => {
            const enc = this.#enc(project)!;
            const encoded = encodeURIComponent(project.namespace_with_path);
            this.#http.delete(`${enc.value.url}api/v4/projects/${encoded}/pipeline_schedules/${schedule.id}`).subscribe(() => {
                project.schedules = project.schedules.filter((sc) => sc.id !== schedule.id);
                done?.();
                if (!project.schedules.length) {
                    this.#service.destroy(project.id).subscribe(() => {
                        this.projects.set(this.projects().filter((p) => p.id !== project.id));
                    });
                }
            });
        };
        return s;
    }

    #bindCallbacks(p: GitlabAuditProject) {
        p.var.onRename = async (project: GitlabAuditProject) => {
            const result = await this.#inputModal.open('rename audit', false, undefined, project.project_name).catch(() => null);
            if (!result?.text?.trim()) return;
            this.#service.update(project.id, { project_name: result.text.trim() }).subscribe(() => {
                project.project_name = result.text.trim();
            });
        };

        p.var.onLinkCompany = async (project: GitlabAuditProject) => {
            const company = await (this.#modalBase as any).open(ModalSearchComponent, 'Company', 'select company').catch(() => null);
            if (!company) return;
            this.#service.update(project.id, { company_id: company.id }).subscribe((updated: any) => {
                project.company_id = updated.company_id;
                project.company = updated.company ? Company.fromJson(updated.company) : company;
            });
        };

        p.var.onUnlinkCompany = (project: GitlabAuditProject) => {
            this.#service.update(project.id, { company_id: null }).subscribe(() => {
                project.company_id = undefined;
                project.company = undefined;
            });
        };

        p.var.onLinkInvoiceItem = async (project: GitlabAuditProject) => {
            const modalRef = this.#ngbModal.open(ModalSelectInvoiceItemComponent, { size: 'lg' });
            const item = await modalRef.result.catch(() => null);
            if (!item) return;
            this.#service.update(project.id, { invoice_item_id: item.id }).subscribe((updated: any) => {
                project.invoice_item_id = updated.invoice_item_id;
                project.invoice_item = updated.invoice_item ?? item;
            });
        };

        p.var.onUnlinkInvoiceItem = (project: GitlabAuditProject) => {
            this.#service.update(project.id, { invoice_item_id: null }).subscribe(() => {
                project.invoice_item_id = undefined;
                project.invoice_item = undefined;
            });
        };

        p.var.onCreateInvoiceItem = async (project: GitlabAuditProject) => {
            const item = await (this.#modalBase as any).open(ModalCreateAuditInvoiceItemComponent, project.company, this.defaultProduct).catch(() => null);
            if (!item) return;
            this.#service.update(project.id, { invoice_item_id: item.id }).subscribe((updated: any) => {
                project.invoice_item_id = updated.invoice_item_id;
                project.invoice_item = updated.invoice_item ?? item;
            });
        };
    }

    openAddModal() {
        (this.#modalBase as any)
            .open(ModalAuditPipelineComponent)
            .then(() => this.load())
            .catch(() => {
                // Modal dismissed
            });
    }

    stageName(description: string): string {
        return description.startsWith(NEXUS_PREFIX) ? description.slice(NEXUS_PREFIX.length) : description;
    }

    cronLabel(cron: string): string {
        const labels: Record<string, string> = {
            '0 0 * * *': 'daily',
            '0 0 * * 0': 'weekly',
            '0 0 1 * *': 'monthly',
        };
        return labels[cron] ?? cron;
    }
}
