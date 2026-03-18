<?php

namespace App\Services;

use App\Enums\Recurrence;
use App\Models\Company;
use App\Models\Param;

class MarketingRemarketingService {
    public static function getRemarketingData(): array {
        $total = Param::get('INVOICE_REVENUE_12M')->value;
        return [
            'due'      => self::getRemarketingDue(),
            'observed' => Company::whereNot('remarketing_interval', Recurrence::None)->get()
                ->map(function ($_) {
                    $_->revenue_12 = $_->param('INVOICE_REVENUE_12M')->value;
                    return $_;
                })
                ->sortByDesc('revenue_12')
                ->values(),
            'suggested' => Company::query()
                ->where('remarketing_interval', Recurrence::None)
                ->whereHas('latestRevenue12Param', fn ($_) => $_->where('value', '>', 0.05 * $total))
                ->with('latestRevenue12Param')
                ->get()
                ->map(function ($_) {
                    $_->setAttribute('revenue_12', $_->latestRevenue12Param?->value);
                    return $_;
                })
                ->sortByDesc('revenue_12')
                ->values(),
        ];
    }
    public static function getRemarketingDue() {
        $now = now();

        return Company::whereNot('remarketing_interval', Recurrence::None)
            ->where(function ($query) use ($now) {
                $query->where(function ($q) use ($now) {
                    $q->where('remarketing_interval', Recurrence::Daily)
                        ->whereRaw('updated_at < ?', [$now->copy()->subDay()]);
                })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::Weekly)
                            ->whereRaw('updated_at < ?', [$now->copy()->subWeek()]);
                    })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::EveryTwoWeeks)
                            ->whereRaw('updated_at < ?', [$now->copy()->subWeeks(2)]);
                    })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::Monthly)
                            ->whereRaw('updated_at < ?', [$now->copy()->subMonths(1)]);
                    })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::EveryTwoMonths)
                            ->whereRaw('updated_at < ?', [$now->copy()->subMonths(2)]);
                    })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::EveryThreeMonths)
                            ->whereRaw('updated_at < ?', [$now->copy()->subMonths(3)]);
                    })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::EverySixMonths)
                            ->whereRaw('updated_at < ?', [$now->copy()->subMonths(6)]);
                    })
                    ->orWhere(function ($q) use ($now) {
                        $q->where('remarketing_interval', Recurrence::Yearly)
                            ->whereRaw('updated_at < ?', [$now->copy()->subYear()]);
                    });
            })
            ->get()
            ->map(function ($_) {
                $_->setAttribute('remarketing_due_at', Recurrence::sub($_->remarketing_interval));
                return $_;
            })
            ->values();
    }
}
