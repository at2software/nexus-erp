import { Directive, computed, effect, inject, input } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { GlobalService } from '@models/global.service';
import { MoneyPipe } from '@pipes/money.pipe';
import { Dictionary } from '@constants/constants';

interface MlReliabilityRegression {
    estimator: string;
    primary_metric: 'MAE';
    value: number;
    r2: number;
    smape: number;
    beats_baseline: boolean;
    baseline_label: string;
    baseline_value: number;
    n: number;
    bucket: 'high' | 'moderate' | 'low';
    trained_at: string;
}

interface MlReliabilityClassification {
    estimator: string;
    primary_metric: 'F1';
    value: number;
    accuracy: number;
    mcc: number;
    precision: number;
    recall: number;
    beats_baseline: boolean;
    baseline_label: string;
    baseline_value: number;
    n: number;
    bucket: 'high' | 'moderate' | 'low';
    trained_at: string;
}

type MlReliability = MlReliabilityRegression | MlReliabilityClassification;

const REGRESSION_UNITS: Dictionary<string> = {
    customer_revenue: '',
    customer_interval: ' days',
    project_hours: 'h',
    project_overrun: 'h',
    support_load: 'h',
};

const PARAM_KEYS: Dictionary<string> = {
    customer_revenue: 'ML_RELIABILITY_CUSTOMER_REVENUE',
    customer_interval: 'ML_RELIABILITY_CUSTOMER_INTERVAL',
    customer_churn: 'ML_RELIABILITY_CUSTOMER_CHURN',
    project_hours: 'ML_RELIABILITY_PROJECT_HOURS',
    project_overrun: 'ML_RELIABILITY_PROJECT_OVERRUN',
    support_load: 'ML_RELIABILITY_SUPPORT_LOAD',
    project_quote_acceptance: 'ML_RELIABILITY_PROJECT_QUOTE_ACCEPTANCE',
};

const BUCKET_LABEL: Dictionary<string> = {
    high: $localize`:@@i18n.ml.reliabilityHigh:high reliability`,
    moderate: $localize`:@@i18n.ml.reliabilityModerate:moderate reliability`,
    low: $localize`:@@i18n.ml.reliabilityLow:low reliability — use with caution`,
};

@Directive({
    selector: '[mlReliability]',
    hostDirectives: [
        {
            directive: NgbTooltip,
            inputs: ['placement', 'container'],
        },
    ],
})
export class MlReliabilityDirective {
    readonly mlReliability = input.required<string>();

    readonly #global = inject(GlobalService);
    readonly #tooltip = inject(NgbTooltip);
    readonly #money = new MoneyPipe();

    readonly #summary = computed((): MlReliability | undefined => {
        if (!this.#global.loaded()) return undefined;
        const paramKey = PARAM_KEYS[this.mlReliability()];
        if (!paramKey) return undefined;
        const raw = this.#global.setting(paramKey);
        if (!raw) return undefined;
        try {
            return JSON.parse(raw as string) as MlReliability;
        } catch {
            return undefined;
        }
    });

    readonly text = computed((): string => {
        const summary = this.#summary();
        if (!summary) return $localize`:@@i18n.ml.reliabilityUnknown:ML estimate · reliability not yet available`;

        const bucketLabel = BUCKET_LABEL[summary.bucket] ?? BUCKET_LABEL['low'];
        const beatsLabel = summary.beats_baseline
            ? $localize`:@@i18n.ml.beatsBaseline:beats the naive baseline (${summary.baseline_label} ${summary.baseline_value})`
            : $localize`:@@i18n.ml.doesNotBeatBaseline:does not beat the naive baseline (${summary.baseline_label} ${summary.baseline_value}) — treat as a rough guide only`;
        const samplesLabel = $localize`:@@i18n.ml.trainedOnSamples:trained on ${summary.n} samples`;

        const metricLabel = summary.primary_metric === 'MAE'
            ? this.#regressionMetricLabel(summary as MlReliabilityRegression)
            : this.#classificationMetricLabel(summary as MlReliabilityClassification);

        const prefix = $localize`:@@i18n.ml.estimatePrefix:ML estimate`;
        return `${prefix} · ${bucketLabel} — ${metricLabel}, ${beatsLabel}, ${samplesLabel}`;
    });

    constructor() {
        effect(() => (this.#tooltip.ngbTooltip = this.text()));
    }

    #regressionMetricLabel(summary: MlReliabilityRegression): string {
        const unit = REGRESSION_UNITS[this.mlReliability()] ?? '';
        const errorValue = unit === '' ? this.#money.transform(summary.value) : `±${summary.value}${unit}`;
        return $localize`:@@i18n.ml.typicalError:R² ${summary.r2} · typical error ${errorValue}`;
    }

    #classificationMetricLabel(summary: MlReliabilityClassification): string {
        if (this.mlReliability() === 'customer_churn') {
            return $localize`:@@i18n.ml.churnedF1:churned-F1 ${summary.value} · recall ${summary.recall}`;
        }
        return $localize`:@@i18n.ml.f1Recall:F1 ${summary.value} · recall ${summary.recall}`;
    }
}
