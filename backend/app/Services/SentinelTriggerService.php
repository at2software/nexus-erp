<?php

namespace App\Services;

use App\Enums\SentinelTriggerType;
use App\Models\Sentinel;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class SentinelTriggerService {
    public static function handleModelBasedTrigger(int $triggerType, Model $model): void {
        $table          = $model->getTable();
        $originalValues = $model->getOriginal();

        $sentinels = Sentinel::where('trigger', $triggerType)
            ->where('table_name', $table)
            ->get();

        foreach ($sentinels as $sentinel) {
            if ($sentinel->matchesModelConditions($model, $originalValues)) {
                self::executeAction($sentinel, $model, $originalValues);
            }
        }
    }
    public static function handleScheduleBasedTriggers(string $time): void {
        $sentinels = Sentinel::where('trigger', SentinelTriggerType::OnSchedule)
            ->where('table_name', $time)
            ->get();

        foreach ($sentinels as $sentinel) {
            if ($sentinel->matchesScheduleConditions(Carbon::now())) {
                self::executeAction($sentinel);
            }
        }
    }
    protected static function executeAction(Sentinel $sentinel, ?Model $model = null, array $originalValues = []): void {
        // Refresh model to ensure relations are accessible
        $model?->refresh();

        $sentinel->execute($model, $originalValues);
    }
}
