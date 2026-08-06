<?php

namespace App\Services\Project;

use App\ML\ProjectQuoteDataset;

class ProjectQuoteSignalCurveService {
    private const BUCKETS          = 10;
    private const MIN_BUCKET_COUNT = 5;

    public static function build(string $signal): ?array {
        if (! in_array($signal, ProjectQuoteDataset::FEATURES, true)) {
            return null;
        }

        $rows = ProjectQuoteDataset::extractRows(ProjectQuoteDataset::eligibleProjects())
            ->filter(fn (array $row) => $row[$signal] !== null)
            ->values();

        if ($rows->count() < self::MIN_BUCKET_COUNT * 2) {
            return null;
        }

        $sorted      = $rows->sortBy($signal)->values();
        $n           = $sorted->count();
        $bucketCount = min(self::BUCKETS, intdiv($n, self::MIN_BUCKET_COUNT));
        if ($bucketCount < 2) {
            return null;
        }

        $points    = [];
        $chunkSize = $n / $bucketCount;
        for ($i = 0; $i < $bucketCount; $i++) {
            $start = (int)round($i * $chunkSize);
            $end   = $i === $bucketCount - 1 ? $n : (int)round(($i + 1) * $chunkSize);
            $chunk = $sorted->slice($start, $end - $start);
            if ($chunk->isEmpty()) {
                continue;
            }
            $points[] = [
                'x'     => round((float)$chunk->avg($signal), 4),
                'y'     => round((float)$chunk->avg(ProjectQuoteDataset::LABEL), 4),
                'count' => $chunk->count(),
            ];
        }

        return ['signal' => $signal, 'points' => $points];
    }
}
