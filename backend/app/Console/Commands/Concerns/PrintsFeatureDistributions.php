<?php

namespace App\Console\Commands\Concerns;

use Illuminate\Support\Collection;

trait PrintsFeatureDistributions {
    private function printDistribution(string $label, Collection $values): void {
        $numeric = $values->filter(fn ($v) => is_numeric($v))->map(fn ($v) => (float)$v)->values();
        $missing = $values->count() - $numeric->count();
        $n       = $numeric->count();

        if ($n === 0) {
            $this->line("  {$label}: no numeric data (missing={$missing})");
            return;
        }

        $sorted   = $numeric->sort()->values();
        $mean     = $numeric->avg();
        $variance = $numeric->reduce(fn ($carry, $v) => $carry + ($v - $mean) ** 2, 0.0) / $n;
        $stddev   = sqrt($variance);
        $median   = $n % 2 === 1
            ? $sorted[intdiv($n, 2)]
            : ($sorted[$n / 2 - 1] + $sorted[$n / 2]) / 2;

        $this->line(sprintf(
            '  %-34s n=%-5d missing=%-4d min=%-10.2f max=%-10.2f mean=%-10.2f median=%-10.2f stddev=%-10.2f',
            $label,
            $n,
            $missing,
            $sorted->first(),
            $sorted->last(),
            $mean,
            $median,
            $stddev
        ));
    }
}
