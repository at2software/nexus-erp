import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ParamService } from 'src/models/param.service';
import { PaymentPlanStep, sortSteps } from './payment-plan-editor.component';

export interface PaymentPlanTier {
    label: string
    threshold: number | null  // null = catch-all (no upper limit)
    steps: PaymentPlanStep[]
}

@Component({
    selector: 'payment-plan-tiers-editor',
    templateUrl: './payment-plan-tiers-editor.component.html',
    styleUrls: ['./payment-plan-editor.component.scss'],
    standalone: true,
    imports: [FormsModule, NgbTooltipModule, EmptyStateComponent],
    host: { style: 'display:contents' }
})
export class PaymentPlanTiersEditorComponent implements OnInit {

    tiers: PaymentPlanTier[] = []

    #paramService = inject(ParamService)

    ngOnInit() {
        this.load()
    }

    load() {
        this.#paramService.show('params/PROJECT_PAYMENT_PLAN_TIERS').subscribe((data: any) => {
            this.tiers = this.#parseTiers(data?.value)
            for (const tier of this.tiers) tier.steps = sortSteps(tier.steps)
        })
    }

    save() {
        for (const tier of this.tiers) tier.steps = sortSteps(tier.steps)
        const json = JSON.stringify(this.tiers)
        this.#paramService.update('params/PROJECT_PAYMENT_PLAN_TIERS', { value: json }).subscribe()
    }

    addTier() {
        this.tiers.push({ label: '', threshold: null, steps: [{ percentage: 100, trigger: 'acceptance' }] })
        this.save()
    }

    removeTier(index: number) {
        this.tiers.splice(index, 1)
        this.save()
    }

    addStep(tier: PaymentPlanTier) {
        const remaining = 100 - this.totalPercentage(tier)
        tier.steps.push({ percentage: remaining, trigger: 'acceptance' })
        this.save()
    }

    removeStep(tier: PaymentPlanTier, index: number) {
        tier.steps.splice(index, 1)
    }

    onTriggerChange(step: PaymentPlanStep) {
        if (step.trigger === 'monthly' && !step.months) {
            step.months = 6
        } else if (step.trigger !== 'monthly') {
            delete step.months
        }
    }

    totalPercentage(tier: PaymentPlanTier): number {
        return tier.steps.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0)
    }

    getTriggerLabel(step: PaymentPlanStep): string {
        switch (step.trigger) {
            case 'project_start':    return $localize`:@@i18n.payment.triggerProjectStart:upon project start`
            case 'feature_complete': return $localize`:@@i18n.payment.triggerFeatureComplete:upon feature complete`
            case 'acceptance':       return $localize`:@@i18n.payment.triggerAcceptance:upon acceptance`
            case 'monthly':          return $localize`:@@i18n.payment.triggerMonthly:${step.months ?? 0} monthly prepayments after project start`
            default:                 return step.trigger
        }
    }

    #parseTiers(value: any): PaymentPlanTier[] {
        if (!value) return []
        if (typeof value === 'string') {
            try { return JSON.parse(value) } catch { return [] }
        }
        return []
    }
}
