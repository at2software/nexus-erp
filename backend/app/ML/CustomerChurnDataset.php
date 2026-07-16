<?php

namespace App\ML;

use App\Models\Company;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Feature extraction for Model C — customer churn classification — the single
 * source of truth shared between training (TrainCustomerChurnModel) and
 * inference (CustomerChurnModel::predict()).
 *
 * A training "row" is a (company, cutoff date) SNAPSHOT. FEATURES are RFM-style
 * signals computed strictly from purchase events with `created_at <= cutoff`
 * (see CustomerSnapshots), and the LABEL is a binary "churned": 1 if the
 * customer made NO purchase-event invoice in the 12 months after the cutoff,
 * 0 otherwise. "Purchase event" excludes repeating-only invoices, identical to
 * CustomerIntervalDataset (a recurring subscription auto-renewing is not a
 * signal that the customer is still actively engaged).
 *
 * Because label = "no purchase in the next 12 months", the label window must be
 * fully in the past for a snapshot to be usable — otherwise a "0" (not churned)
 * could just mean "we haven't observed the next 12 months yet".
 */
class CustomerChurnDataset {
    /** Feature names, in extraction order. */
    public const FEATURES = [
        'days_since_last_purchase',
        'mean_gap_days',
        'median_gap_days',
        'gap_stddev_days',
        'last_gap_days',
        'purchase_count_to_date',
        'purchase_count_trailing_12m',
        'tenure_days',
        'recency_over_mean_gap',
    ];

    public const LABEL = 'churned';

    /** How many months after the cutoff define the churn observation window. */
    public const LABEL_WINDOW_MONTHS = 12;

    /** Need at least this many prior purchase events (2 real gaps) to compute cadence features. */
    public const MIN_PRIOR_PURCHASES = 3;

    /**
     * Eligible companies: active, not ME_ID, with at least MIN_PRIOR_PURCHASES
     * non-repeating-only purchase-event invoices.
     *
     * @return Collection<int, Company>
     */
    public static function eligibleCompanies(): Collection {
        return CustomerSnapshots::eligibleCompaniesQuery()
            ->get()
            ->filter(fn (Company $company) => CustomerIntervalDataset::purchaseEvents(CustomerSnapshots::invoicesFor($company))->count() >= self::MIN_PRIOR_PURCHASES)
            ->values();
    }

    /**
     * All valid snapshot rows for one company: one row per candidate cutoff
     * with enough prior purchases AND a fully-observed 12-month post-cutoff
     * window (so a "not churned" label is trustworthy).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function extractRowsForCompany(Company $company): array {
        $invoices  = CustomerSnapshots::invoicesFor($company);
        $purchases = CustomerIntervalDataset::purchaseEvents($invoices);
        if ($purchases->count() < self::MIN_PRIOR_PURCHASES) {
            return [];
        }

        $lastPurchaseAt = Carbon::parse($purchases->last()->created_at);
        $rows           = [];

        foreach (CustomerSnapshots::candidateCutoffs($invoices) as $cutoff) {
            $before = $purchases->filter(fn ($i) => Carbon::parse($i->created_at)->lte($cutoff))->values();
            if ($before->count() < self::MIN_PRIOR_PURCHASES) {
                continue;
            }

            // The 12-month observation window must be fully in the past relative to the
            // company's data, i.e. the last purchase we know about must be at/after
            // cutoff + 12mo, OR the cutoff + 12mo is before the last purchase — either way
            // we must be able to observe the whole window. We require cutoff+12mo <= last
            // known purchase date so "no purchase in window" isn't just "unobserved yet".
            if ($cutoff->copy()->addMonths(self::LABEL_WINDOW_MONTHS)->gt($lastPurchaseAt)) {
                continue;
            }

            $rows[] = self::extractRow($company, $purchases, $cutoff);
        }
        return $rows;
    }

    /**
     * One (company, cutoff) snapshot's features + binary churn label.
     *
     * @param Collection<int, Invoice> $purchases ALL of the company's purchase-event invoices
     * @return array<string, mixed>
     */
    public static function extractRow(Company $company, Collection $purchases, Carbon $cutoff): array {
        $before = $purchases->filter(fn ($i) => Carbon::parse($i->created_at)->lte($cutoff))->values();

        $dates = $before->map(fn ($i) => Carbon::parse($i->created_at))->values();
        $gaps  = CustomerSnapshots::consecutiveGaps($dates);

        $mean   = CustomerSnapshots::meanGap($gaps);
        $median = CustomerSnapshots::median($gaps);
        $stddev = CustomerSnapshots::stddev($gaps, $mean);

        $lastPurchaseAt = $dates->last();
        $daysSinceLast  = $lastPurchaseAt->diffInDays($cutoff);

        $trailing12m = $before->filter(fn ($i) => Carbon::parse($i->created_at)->gt($cutoff->copy()->subMonths(12)));

        // Churn = zero purchase events in (cutoff, cutoff + 12 months].
        $windowEnd     = $cutoff->copy()->addMonths(self::LABEL_WINDOW_MONTHS);
        $purchasesNext = $purchases->filter(function ($i) use ($cutoff, $windowEnd) {
            $at = Carbon::parse($i->created_at);
            return $at->gt($cutoff) && $at->lte($windowEnd);
        });

        return [
            'company_id'                    => $company->id,
            'cutoff'                        => $cutoff->toDateString(),
            'days_since_last_purchase'      => $daysSinceLast,
            'mean_gap_days'                 => $mean,
            'median_gap_days'               => $median,
            'gap_stddev_days'               => $stddev,
            'last_gap_days'                 => $gaps[count($gaps) - 1],
            'purchase_count_to_date'        => $before->count(),
            'purchase_count_trailing_12m'   => $trailing12m->count(),
            'tenure_days'                   => $dates->first()->diffInDays($cutoff),
            // Recency relative to the customer's own rhythm — the single strongest churn
            // signal (well past your usual gap = probably gone). Null if mean gap is 0.
            'recency_over_mean_gap'         => ($mean !== null && $mean > 0) ? $daysSinceLast / $mean : null,
            self::LABEL                     => $purchasesNext->isEmpty() ? 1 : 0,
        ];
    }

    /**
     * extractRowsForCompany() across a whole collection of eligible companies.
     *
     * @param Collection<int, Company> $companies
     * @return Collection<int, array<string, mixed>>
     */
    public static function extractRows(Collection $companies): Collection {
        $rows = [];
        foreach ($companies as $company) {
            array_push($rows, ...self::extractRowsForCompany($company));
        }
        return collect($rows);
    }
}
