import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { MarketingWorkflow } from '@models/marketing/marketing-workflow.model';
import { MarketingPerformanceMetric } from '@models/marketing/marketing-performance-metrics.model';
import { IActivityBase } from '@models/marketing/activity-base.interface';
import { QuickActionType } from '@models/marketing/marketing-activity.model';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { I18nTextareaComponent } from '@app/_shards/i18n-textarea/i18n-textarea.component';

type ActivityMode = 'initiative' | 'workflow';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-activity-detail',
    templateUrl: './marketing-activity-detail.component.html',
    standalone: true,
    imports: [FormsModule, NgbDropdownModule, NgbTooltipModule, SpinnerComponent, I18nTextareaComponent],
})
export class MarketingActivityDetailComponent {
    #route = inject(ActivatedRoute);
    #marketingService = inject(MarketingService);

    readonly mode: ActivityMode;

    context = signal<MarketingInitiative | MarketingWorkflow | null>(null);
    activity = signal<IActivityBase | null>(null);
    isLoading = signal(false);
    isSaving = signal(false);
    availableMetrics: MarketingPerformanceMetric[] = [];

    editName = '';
    editDayOffset = 0;
    editDescription: string | { language: string; formality: string; text: string }[] = '';
    editIsRequired = false;
    editHasExternalDependency = false;
    editParentActivityId = '';
    editQuickAction: QuickActionType = null;
    selectedKpiId = '';

    readonly quickActions: { value: QuickActionType; label: string }[] = [
        { value: null, label: 'none' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'LINKEDIN', label: 'LinkedIn' },
        { value: 'LINKEDIN_SEARCH', label: 'LinkedIn Search' },
        { value: 'CALL', label: 'Call' },
    ];

    readonly siblingActivities = computed<IActivityBase[]>(() => {
        const ctx = this.context();
        if (!ctx) return [];
        return 'initiative_activities' in ctx
            ? (ctx as MarketingInitiative).initiative_activities ?? []
            : (ctx as MarketingWorkflow).marketing_activities ?? [];
    });

    get selectedQuickActionLabel(): string {
        return this.quickActions.find((qa) => qa.value === this.editQuickAction)?.label ?? 'none';
    }

    get selectedParentActivityLabel(): string {
        if (!this.editParentActivityId) return 'none';
        const a = this.siblingActivities().find((a) => String(a.id) === this.editParentActivityId);
        return a ? `D${a.day_offset} – ${a.name}` : 'none';
    }

    get selectedMetricLabel(): string {
        return this.availableMetrics.find((m) => String(m.id) === this.selectedKpiId)?.name ?? 'none';
    }

    constructor() {
        this.mode = this.#route.snapshot.data['mode'] ?? 'initiative';
        this.#route.params.subscribe((params) => {
            const parentId = this.#route.parent?.snapshot.params['id'];
            const activityId = params['activityId'];
            if (parentId && activityId) this.#loadData(parentId, activityId);
        });
    }

    #loadData(parentId: string, activityId: string) {
        this.isLoading.set(true);
        if (!this.availableMetrics.length) {
            this.#marketingService.indexMetrics().subscribe((m) => (this.availableMetrics = m));
        }
        const load$: Observable<any> = this.mode === 'initiative'
            ? this.#marketingService.showInitiative(parentId)
            : this.#marketingService.showWorkflow(parentId);

        load$.subscribe({
            next: (ctx: any) => {
                this.context.set(ctx);
                const activity = this.siblingActivities().find((a) => String(a.id) === activityId) ?? null;
                this.activity.set(activity);
                if (activity) this.#populateForm(activity);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false),
        });
    }

    #populateForm(activity: IActivityBase) {
        this.editName = activity.name;
        this.editDayOffset = activity.day_offset;
        this.editDescription = activity.description ?? '';
        this.editIsRequired = activity.is_required;
        this.editHasExternalDependency = activity.has_external_dependency ?? false;
        this.editParentActivityId = activity.parent_activity_id ?? '';
        this.editQuickAction = activity.quick_action ?? null;
        this.selectedKpiId = activity.performance_metrics?.[0]?.id?.toString() ?? '';
    }

    saveActivity() {
        const activity = this.activity();
        const ctx = this.context();
        if (!activity || !ctx) return;

        this.isSaving.set(true);
        const parentId = String(ctx.id);
        const activityId = String(activity.id);
        const prevMetricId = activity.performance_metrics?.[0]?.id?.toString() ?? '';

        const payload = {
            name: this.editName,
            day_offset: this.editDayOffset,
            description: this.editDescription || null,
            is_required: this.editIsRequired,
            has_external_dependency: this.editHasExternalDependency,
            parent_activity_id: this.editParentActivityId || null,
            quick_action: this.editQuickAction,
        };

        const save$: Observable<any> = this.mode === 'initiative'
            ? this.#marketingService.updateInitiativeActivity(parentId, activityId, payload)
            : this.#marketingService.updateWorkflowActivity(parentId, activityId, payload);

        save$.pipe(
            switchMap((updated: IActivityBase) => {
                this.activity.set(updated);
                return this.#syncMetric(parentId, activityId, prevMetricId);
            })
        ).subscribe({
            next: () => {
                if (this.mode === 'initiative') {
                    this.#marketingService.initiativeActivitySaved$.next(parentId);
                } else {
                    this.#marketingService.workflowActivitySaved$.next(parentId);
                }
                this.isSaving.set(false);
            },
            error: () => this.isSaving.set(false),
        });
    }

    #syncMetric(parentId: string, activityId: string, prevMetricId: string): Observable<any> {
        if (prevMetricId === this.selectedKpiId) return of(null);
        const ops: Observable<any>[] = [];
        if (this.mode === 'initiative') {
            if (prevMetricId) ops.push(this.#marketingService.detachMetricFromInitiativeActivity(parentId, activityId, prevMetricId));
            if (this.selectedKpiId) ops.push(this.#marketingService.attachMetricToInitiativeActivity(parentId, activityId, { metric_id: this.selectedKpiId }));
        } else {
            if (prevMetricId) ops.push(this.#marketingService.detachMetricFromActivity(activityId, prevMetricId));
            if (this.selectedKpiId) ops.push(this.#marketingService.attachMetricToActivity(activityId, { metric_id: this.selectedKpiId }));
        }
        return ops.length ? forkJoin(ops) : of(null);
    }
}
