<?php

namespace App\Services;

use App\Enums\CashFlowParams;
use App\Models\FloatParam;
use App\Models\Param;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;

class CashFlowService {
    public static function getCashFlowData() {
        $params   = CashFlowParams::getParams();
        $paramIds = $params->map(fn ($_) => $_->id);
        $data     = FloatParam::whereIn('param_id', $paramIds)
            ->whereNull('parent_type')
            ->whereNull('parent_id')
            ->latest()
            ->paginate(100);
        $data->getCollection()->transform(function ($_) {
            $_->key = $_->base->key;
            return $_->only(['key', 'id', 'value', 'created_at']);
        });
        return $data;
    }
    public static function importBankCsv(UploadedFile $file): array {
        $lines = explode("\n", file_get_contents($file->getRealPath()));
        if (count($lines) < 2) {
            return ['error' => 'CSV file is empty', 'imported' => 0];
        }

        $header           = str_getcsv($lines[0], ';');
        $saldoIndex       = array_search('Saldo', $header);
        $buchungstagIndex = array_search('Buchungstag', $header);

        if ($saldoIndex === false || $buchungstagIndex === false) {
            return ['error' => 'Required columns not found', 'imported' => 0];
        }

        $param       = Param::get('CASHFLOW_BANK_BALANCE');
        $latestEntry = FloatParam::where('param_id', $param->id)
            ->whereNull('parent_type')
            ->whereNull('parent_id')
            ->latest('created_at')
            ->first();

        $latestDate    = $latestEntry?->created_at?->startOfDay();
        $latestValue   = $latestEntry?->value ?? 0;
        $entriesByDate = self::parseCSVEntries($lines, $saldoIndex, $buchungstagIndex, $latestDate);

        if (empty($entriesByDate)) {
            return ['success' => true, 'imported' => 0];
        }

        ksort($entriesByDate);
        $dates     = array_keys($entriesByDate);
        $firstDate = Carbon::parse($dates[0]);
        $lastDate  = Carbon::parse(end($dates));

        $imported = self::importEntries($param, $entriesByDate, $latestDate, $latestValue, $firstDate, $lastDate);
        return ['success' => true, 'imported' => $imported];
    }
    protected static function parseCSVEntries(array $lines, int $saldoIndex, int $buchungstagIndex, ?Carbon $latestDate): array {
        $entriesByDate = [];

        for ($i = 1; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            if (empty($line)) {
                continue;
            }

            $row = str_getcsv($line, ';');
            if (count($row) <= max($saldoIndex, $buchungstagIndex)) {
                continue;
            }

            try {
                $date = Carbon::createFromFormat('d.m.Y', $row[$buchungstagIndex])->startOfDay();
                if ($latestDate && $date->lte($latestDate)) {
                    continue;
                }

                $entriesByDate[$date->format('Y-m-d')] = [
                    'date'  => $date,
                    'value' => (float)str_replace(',', '.', $row[$saldoIndex]),
                ];
            } catch (\Exception $e) {
                continue;
            }
        }
        return $entriesByDate;
    }
    protected static function importEntries(Param $param, array $entriesByDate, ?Carbon $latestDate, float $latestValue, Carbon $firstDate, Carbon $lastDate): int {
        $imported     = 0;
        $currentDate  = $latestDate?->copy()->addDay() ?? $firstDate->copy();
        $currentValue = $latestValue;

        while ($currentDate->lte($lastDate)) {
            $dateKey = $currentDate->format('Y-m-d');
            if (isset($entriesByDate[$dateKey])) {
                $currentValue = $entriesByDate[$dateKey]['value'];
            }

            FloatParam::create([
                'param_id'   => $param->id,
                'value'      => $currentValue,
                'created_at' => $currentDate->copy(),
                'updated_at' => $currentDate->copy(),
            ]);

            $imported++;
            $currentDate->addDay();
        }
        return $imported;
    }
}
