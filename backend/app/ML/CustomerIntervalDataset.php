<?php

namespace App\ML;

use App\Enums\InvoiceItemType;
use App\Models\Company;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Feature extraction for Model B — re-purchase interval prediction — the
 * single source of truth shared between training (TrainCustomerIntervalModel)
 * and inference (CustomerIntervalModel::predict()).
 *
 * A training "row" is a (company, cutoff date) SNAPSHOT: features come from
 * "purchase events" with `created_at <= cutoff` (see CustomerSnapshots for the
 * general leakage boundary), and the LABEL is the gap in days between the
 * cutoff's most recent purchase and the NEXT purchase event after it.
 *
 * "Purchase event" deliberately EXCLUDES invoices whose items are entirely
 * InvoiceItemType::Repeating (deterministic recurring subscriptions with a
 * known `next_recurrence_at` — the cadence is already known, so it's not an
 * interesting ML target and would just inject a trivially-predictable rhythm
 * into what should be a "when will they buy something new" signal). An invoice
 * counts as a purchase event if it has AT LEAST ONE non-Repeating item.
 * Model A (revenue) still counts repeating-item revenue — this exclusion is
 * specific to Model B's interval semantics.
 */
class CustomerIntervalDataset {
    /** Feature names, in extraction order. */
    public const FEATURES = [
        'mean_gap_days',
        'median_gap_days',
        'gap_stddev_days',
        'purchase_count_to_date',
        'days_since_last_purchase',
        'tenure_days',
        'last_gap_days',
    ];

    public const LABEL = 'next_gap_days';

    /** Need at least this many prior purchase events for 2 real historical gaps. */
    public const MIN_PRIOR_PURCHASES = 3;

    /**
     * Eligible companies: active, not the own (ME_ID) company, with at least
     * MIN_PRIOR_PURCHASES non-repeating-only purchase-event invoices.
     *
     * @return Collection<int, Company>
     */
    public static function eligibleCompanies(): Collection {
        return CustomerSnapshots::eligibleCompaniesQuery()
            ->get()
            ->filter(fn (Company $company) => self::purchaseEvents(CustomerSnapshots::invoicesFor($company))->count() >= self::MIN_PRIOR_PURCHASES)
            ->values();
    }

    /**
     * Filters a company's (already non-cancelled) invoices down to "purchase
     * events" — invoices with at least one non-Repeating-type item.
     *
     * @param Collection<int, Invoice> $invoices
     * @return Collection<int, Invoice>
     */
    public static function purchaseEvents(Collection $invoices): Collection {
        return $invoices->filter(function (Invoice $invoice) {
            return $invoice->invoiceItems->contains(fn ($item) => ! in_array($item->type, InvoiceItemType::Repeating, true));
        })->values();
    }

    /**
     * All valid snapshot rows for one company: one row per candidate cutoff
     * that has both enough prior purchase events AND a known next purchase
     * event still present in the data (so the label isn't unobservable).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function extractRowsForCompany(Company $company): array {
        $invoices  = CustomerSnapshots::invoicesFor($company);
        $purchases = self::purchaseEvents($invoices);
        if ($purchases->count() < self::MIN_PRIOR_PURCHASES) {
            return [];
        }

        $rows = [];
        foreach (CustomerSnapshots::candidateCutoffs($invoices) as $cutoff) {
            $before = $purchases->filter(fn ($i) => Carbon::parse($i->created_at)->lte($cutoff))->values();
            if ($before->count() < self::MIN_PRIOR_PURCHASES) {
                continue;
            }

            $after = $purchases->filter(fn ($i) => Carbon::parse($i->created_at)->gt($cutoff))->values();
            if ($after->isEmpty()) {
                continue; // no known next purchase yet — label unobservable
            }

            $row = self::extractRow($company, $purchases, $cutoff);
            if ($row === null) {
                continue;
            }
            $rows[] = $row;
        }
        return $rows;
    }

    /**
     * One (company, cutoff) snapshot's features + label, or null if there's no
     * observable next purchase after the cutoff (can't compute a label).
     *
     * @param Collection<int, Invoice> $purchases ALL of the company's purchase-event invoices (see purchaseEvents())
     * @return array<string, mixed>|null
     */
    public static function extractRow(Company $company, Collection $purchases, Carbon $cutoff): ?array {
        $before = $purchases->filter(fn ($i) => Carbon::parse($i->created_at)->lte($cutoff))->values();
        $after  = $purchases->filter(fn ($i) => Carbon::parse($i->created_at)->gt($cutoff))->values();
        if ($before->count() < self::MIN_PRIOR_PURCHASES || $after->isEmpty()) {
            return null;
        }

        $dates = $before->map(fn ($i) => Carbon::parse($i->created_at))->values();
        $gaps  = CustomerSnapshots::consecutiveGaps($dates);

        $lastPurchaseAt = $dates->last();
        $nextPurchaseAt = Carbon::parse($after->first()->created_at);

        $mean   = CustomerSnapshots::meanGap($gaps);
        $median = CustomerSnapshots::median($gaps);
        $stddev = CustomerSnapshots::stddev($gaps, $mean);

        return [
            'company_id'                => $company->id,
            'cutoff'                    => $cutoff->toDateString(),
            'mean_gap_days'             => $mean,
            'median_gap_days'           => $median,
            'gap_stddev_days'           => $stddev,
            'purchase_count_to_date'    => $before->count(),
            // Carbon's diffInDays($other) returns $other - $this (signed) — lastPurchaseAt
            // and the first purchase date are BEFORE the cutoff, so the call order must put
            // the cutoff second or this silently returns negative values (see CustomerRevenueDataset).
            'days_since_last_purchase'  => $lastPurchaseAt->diffInDays($cutoff),
            'tenure_days'               => $dates->first()->diffInDays($cutoff),
            'last_gap_days'             => $gaps[count($gaps) - 1],
            self::LABEL                 => $lastPurchaseAt->diffInDays($nextPurchaseAt),
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

    /** Right-skewed gap-in-days → log-transform for the regression target. */
    public static function logLabel(float $days): float {
        return log(max(0.0, $days) + 1);
    }
}
