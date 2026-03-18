import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from 'src/models/serializable';
import { ParamService } from 'src/models/param.service';

export interface PaymentPlanStep {
    percentage: number
    trigger: 'acceptance' | 'project_start' | 'feature_complete' | 'monthly'
    months?: number
}

const TRIGGER_ORDER: Record<string, number> = { project_start: 0, monthly: 1, feature_complete: 2, acceptance: 3 }
export function sortSteps<T extends { trigger: string }>(steps: T[]): T[] {
    return [...steps].sort((a, b) => (TRIGGER_ORDER[a.trigger] ?? 99) - (TRIGGER_ORDER[b.trigger] ?? 99))
}

@Component({
    selector: 'payment-plan-editor',
    templateUrl: './payment-plan-editor.component.html',
    styleUrls: ['./payment-plan-editor.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NgbTooltipModule]
})
export class PaymentPlanEditorComponent implements OnInit, OnChanges {

    @Input() object?: Serializable

    steps: PaymentPlanStep[] = []
    editSteps: PaymentPlanStep[] = []
    isEditing = false
    isFallback = false
    activeTierLabel = ''

    #paramService = inject(ParamService)

    ngOnInit() {
        this.load()
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['object'] && !changes['object'].firstChange) {
            this.load()
        }
    }

    load() {
        if (!this.object) return
        this.object.showParam('PROJECT_PAYMENT_PLAN', { fallback: false }).subscribe((data: any) => {
            if (data?.value) {
                this.isFallback = false
                this.activeTierLabel = ''
                this.steps = sortSteps(this.#parseSteps(data.value))
            } else {
                this.#loadTierFallback()
            }
        })
    }

    #loadTierFallback() {
        const budget = (this.object as any)?.net ?? 0
        this.#paramService.show('params/PROJECT_PAYMENT_PLAN_TIERS').subscribe((data: any) => {
            const tiers = this.#parseTiers(data?.value)
            const tier  = tiers.find(t => t.threshold === null || budget < t.threshold) ?? tiers[tiers.length - 1]
            if (tier) {
                this.isFallback      = true
                this.activeTierLabel = tier.label ?? ''
                this.steps           = sortSteps(tier.steps ?? [])
            } else {
                this.isFallback      = true
                this.activeTierLabel = ''
                this.steps           = []
            }
        })
    }

    startEdit() {
        this.editSteps = this.steps.map(s => ({ ...s }))
        if (this.editSteps.length === 0) {
            this.editSteps = [{ percentage: 100, trigger: 'acceptance' }]
        }
        this.isEditing = true
    }

    cancelEdit() {
        this.isEditing = false
        this.editSteps = []
    }

    save() {
        if (this.totalPercentage !== 100 || !this.object) return
        this.editSteps = sortSteps(this.editSteps)
        const json = JSON.stringify(this.editSteps)
        this.object.updateParam('PROJECT_PAYMENT_PLAN', { value: json }).subscribe(() => {
            this.steps           = this.editSteps.map(s => ({ ...s }))
            this.isFallback      = false
            this.activeTierLabel = ''
            this.isEditing       = false
        })
    }

    revertToDefault() {
        this.object?.updateParam('PROJECT_PAYMENT_PLAN', { value: null }).subscribe(() => this.load())
    }

    addStep() {
        this.editSteps.push({ percentage: 0, trigger: 'acceptance' })
    }

    removeStep(index: number) {
        this.editSteps.splice(index, 1)
    }

    onTriggerChange(step: PaymentPlanStep) {
        if (step.trigger === 'monthly' && !step.months) {
            step.months = 6
        } else if (step.trigger !== 'monthly') {
            delete step.months
        }
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

    get totalPercentage(): number {
        return this.editSteps.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0)
    }

    #parseSteps(value: any): PaymentPlanStep[] {
        if (!value) return []
        if (typeof value === 'string') {
            try { return JSON.parse(value) } catch { return [] }
        }
        return []
    }

    #parseTiers(value: any): { label: string; threshold: number | null; steps: PaymentPlanStep[] }[] {
        if (!value) return []
        if (typeof value === 'string') {
            try { return JSON.parse(value) } catch { return [] }
        }
        return []
    }
}
