<?php

namespace App\ML;

use App\Models\Company;
use App\Models\Focus;
use App\Models\Invoice;
use App\Models\Param;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Shared per-company snapshot machinery for Model A (CustomerRevenueDataset) and
 * Model B (CustomerIntervalDataset). Both models train on historical "snapshots" —
 * a company + a cutoff date — rather than one row per company, because a single
 * row per company would give too few training examples and would waste years of
 * history that's only usable as of a particular point in time.
 *
 * Leakage boundary (shared by both models): a snapshot's FEATURES may only use
 * invoices with `created_at <= cutoff`. What differs per model is the LABEL
 * window after the cutoff (see CustomerRevenueDataset/CustomerIntervalDataset).
 */
class CustomerSnapshots {
    /** Cutolffs are generated quarterly to avoid near-duplicate snapshots swamping company groups. */
    public const CUTOFF_STEP_MONTHS = 3;

    /** Exclude the own company (ME_ID) and deprecated/inactive customers — mirrors CompanyBuilder::whereActive(). */
    public static function eligibleCompaniesQuery(): Builder {
        $meId = Param::get('ME_ID')->value;

        return Company::whereActive()
            ->whereNot('id', $meId);
    }

    /**
     * Non-cancelled invoices for a company, oldest first. `is_cancelled` may be
     * null (legacy rows) — treat null as "not cancelled", the same pattern used in
     * BackfillForecastRevenue12::computeRevenue().
     *
     * @return Collection<int, Invoice>
     */
    public static function invoicesFor(Company $company): Collection {
        return $company->invoices()
            ->where(fn ($q) => $q->where('is_cancelled', false)->orWhereNull('is_cancelled'))
            ->orderBy('created_at')
            ->with('invoiceItems')
            ->get();
    }

    /**
     * Candidate cutoff dates for a company: quarterly steps between its earliest
     * and latest (non-cancelled) invoice dates. Callers filter these down further
     * (e.g. requiring a minimum pre-cutoff history and a full post-cutoff label
     * window still present in the data).
     *
     * @param Collection<int, Invoice> $invoices oldest-first, from invoicesFor()
     * @return Carbon[]
     */
    public static function candidateCutoffs(Collection $invoices): array {
        if ($invoices->count() < 2) {
            return [];
        }

        $first = Carbon::parse($invoices->first()->created_at)->startOfMonth();
        $last  = Carbon::parse($invoices->last()->created_at)->startOfMonth();

        $cutoffs = [];
        $cursor  = $first->copy();
        while ($cursor->lte($last)) {
            $cutoffs[] = $cursor->copy()->endOfMonth();
            $cursor->addMonths(self::CUTOFF_STEP_MONTHS);
        }
        return $cutoffs;
    }

    /** Invoices strictly at or before the cutoff — the only ones features may see. */
    public static function invoicesBefore(Collection $invoices, Carbon $cutoff): Collection {
        return $invoices->filter(fn ($invoice) => Carbon::parse($invoice->created_at)->lte($cutoff))->values();
    }

    /** Invoices strictly after the cutoff — only the label extraction may see these. */
    public static function invoicesAfter(Collection $invoices, Carbon $cutoff): Collection {
        return $invoices->filter(fn ($invoice) => Carbon::parse($invoice->created_at)->gt($cutoff))->values();
    }

    /** Invoices in (cutoff, cutoff + $months months] — Model A's label window. */
    public static function invoicesInWindow(Collection $invoices, Carbon $cutoff, int $months): Collection {
        $end = $cutoff->copy()->addMonths($months);
        return $invoices->filter(function ($invoice) use ($cutoff, $end) {
            $at = Carbon::parse($invoice->created_at);
            return $at->gt($cutoff) && $at->lte($end);
        })->values();
    }

    /** Sum of `net` across a set of already-loaded invoices (their invoiceItems must be eager-loaded). */
    public static function sumNet(Collection $invoices): float {
        return (float)$invoices->sum(fn ($invoice) => $invoice->net);
    }

    /**
     * Support foci for a company, oldest first — foci attached directly to the
     * company (`parent_type = Company::class`, i.e. `$company->foci()`), the
     * SAME predicate used by `CompanyBuilder::whereHasUnbilledFoci()` /
     * `WidgetController::GET_CASHFLOW_CUSTOMER_SUPPORT` / `addFociBadges()`, as
     * opposed to foci logged against a project (a budget project's own work).
     * Unlike `foci_unbilled`, this deliberately does NOT filter by billed/unpaid
     * status — a support-load forecast should reflect all hours actually
     * worked, not just what's still awaiting invoicing (see
     * docs/ml/support-load-plan.md).
     *
     * @return Collection<int, Focus>
     */
    public static function fociFor(Company $company): Collection {
        return $company->foci()->orderBy('started_at')->get();
    }

    /**
     * Candidate cutoff dates for a company's foci history — the same quarterly
     * scheme as candidateCutoffs(), but keyed on `started_at` (when the work
     * happened) rather than an invoice's `created_at`, since Focus rows don't
     * share that column.
     *
     * @param Collection<int, Focus> $foci oldest-first, from fociFor()
     * @return Carbon[]
     */
    public static function fociCandidateCutoffs(Collection $foci): array {
        if ($foci->count() < 2) {
            return [];
        }

        $first = Carbon::parse($foci->first()->started_at)->startOfMonth();
        $last  = Carbon::parse($foci->last()->started_at)->startOfMonth();

        $cutoffs = [];
        $cursor  = $first->copy();
        while ($cursor->lte($last)) {
            $cutoffs[] = $cursor->copy()->endOfMonth();
            $cursor->addMonths(self::CUTOFF_STEP_MONTHS);
        }
        return $cutoffs;
    }

    /** Foci strictly at or before the cutoff (by `started_at`) — the only ones features may see. */
    public static function fociBefore(Collection $foci, Carbon $cutoff): Collection {
        return $foci->filter(fn ($focus) => Carbon::parse($focus->started_at)->lte($cutoff))->values();
    }

    /** Foci strictly after the cutoff (by `started_at`) — only the label extraction may see these. */
    public static function fociAfter(Collection $foci, Carbon $cutoff): Collection {
        return $foci->filter(fn ($focus) => Carbon::parse($focus->started_at)->gt($cutoff))->values();
    }

    /**
     * Foci in (cutoff, cutoff + $months months] by `started_at` — the support-load label
     * window. Uses `addMonthsNoOverflow` (not `addMonths`): cutoffs are always end-of-month
     * (see candidateCutoffs/fociCandidateCutoffs), and plain `addMonths` on a day-31 cutoff
     * silently overflows into the FOLLOWING month when the target month is shorter (e.g.
     * Jan 31 + 3 months = May 1, not Apr 30) — a day off is enough to leak an extra focus
     * into the label window on roughly half of all quarterly cutoffs. NoOverflow clamps to
     * the target month's actual last day instead.
     */
    public static function fociInWindow(Collection $foci, Carbon $cutoff, int $months): Collection {
        $end = $cutoff->copy()->addMonthsNoOverflow($months);
        return $foci->filter(function ($focus) use ($cutoff, $end) {
            $at = Carbon::parse($focus->started_at);
            return $at->gt($cutoff) && $at->lte($end);
        })->values();
    }

    /** Sum of `duration` across a set of already-loaded foci — the `sumNet` sibling for support hours. */
    public static function sumDuration(Collection $foci): float {
        return (float)$foci->sum(fn ($focus) => $focus->duration);
    }

    /** @param float[] $gapsInDays consecutive inter-purchase gaps, oldest-pair-first */
    public static function meanGap(array $gapsInDays): ?float {
        return count($gapsInDays) > 0 ? array_sum($gapsInDays) / count($gapsInDays) : null;
    }

    /** @param float[] $values */
    public static function median(array $values): ?float {
        $n = count($values);
        if ($n === 0) {
            return null;
        }
        sort($values);
        return $n % 2 === 1
            ? (float)$values[intdiv($n, 2)]
            : ($values[$n / 2 - 1] + $values[$n / 2]) / 2;
    }

    /** @param float[] $values */
    public static function stddev(array $values, ?float $mean): ?float {
        $n = count($values);
        if ($n === 0 || $mean === null) {
            return null;
        }
        $variance = array_sum(array_map(fn ($v) => ($v - $mean) ** 2, $values)) / $n;
        return sqrt($variance);
    }

    /**
     * Consecutive inter-purchase gaps in days across an ordered date sequence.
     *
     * @param Collection<int, Carbon> $dates oldest first
     * @return float[]
     */
    public static function consecutiveGaps(Collection $dates): array {
        $gaps = [];
        for ($i = 1; $i < $dates->count(); $i++) {
            $gaps[] = $dates[$i - 1]->diffInDays($dates[$i]);
        }
        return $gaps;
    }
}
