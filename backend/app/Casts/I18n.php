<?php

namespace App\Casts;

use App\Models\I18n as I18nModel;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class I18n implements CastsAttributes {
    public function __construct(protected string $markerValue = '@@i18n') {}

    public function get(Model $model, string $key, mixed $value, array $attributes): mixed {
        // If value is the marker, return array of i18n objects
        if ($value === $this->markerValue && $model->exists) {
            $i18nRecords = I18nModel::where([
                'parent_type' => get_class($model),
                'parent_id'   => $model->getKey(),
            ])->get();

            if ($i18nRecords->isNotEmpty()) {
                return $i18nRecords->map(fn ($record) => [
                    'language'  => $record->language,
                    'formality' => $record->formality,
                    'text'      => $record->text,
                ])->toArray();
            }
        }

        // Plain string value
        return $value;
    }
    public function set(Model $model, string $key, mixed $value, array $attributes): mixed {
        // Handle array of i18n objects: [{ language: "en", formality: "informal", text: "..." }, ...]
        if (is_array($value) && isset($value[0]) && is_array($value[0]) && isset($value[0]['language'])) {
            if (! $model->exists) {
                $pending              = $model->__pendingI18n ?? [];
                $pending[$key]        = $value;
                $model->__pendingI18n = $pending;
                return $this->markerValue;
            }

            // Update each variant
            foreach ($value as $variant) {
                if (isset($variant['language']) && isset($variant['text'])) {
                    I18nModel::updateOrCreate(
                        [
                            'parent_type' => get_class($model),
                            'parent_id'   => $model->getKey(),
                            'language'    => $variant['language'],
                            'formality'   => $variant['formality'] ?? 'formal',
                        ],
                        [
                            'text' => $variant['text'],
                        ]
                    );
                }
            }

            return $this->markerValue;
        }

        // Handle single i18n object: { language: "en", formality: "informal", text: "..." }
        if (is_array($value) && isset($value['language']) && isset($value['text'])) {
            if (! $model->exists) {
                $pending              = $model->__pendingI18n ?? [];
                $pending[$key]        = $value;
                $model->__pendingI18n = $pending;
                return $this->markerValue;
            }

            // Check if this is the first localization (no existing i18n records)
            $existingI18n = I18nModel::where([
                'parent_type' => get_class($model),
                'parent_id'   => $model->getKey(),
            ])->exists();

            if (! $existingI18n) {
                // First time localizing - create all 4 variants with the same text
                $variants = [
                    ['language' => 'de', 'formality' => 'formal'],
                    ['language' => 'de', 'formality' => 'informal'],
                    ['language' => 'en', 'formality' => 'formal'],
                    ['language' => 'en', 'formality' => 'informal'],
                ];

                foreach ($variants as $variant) {
                    I18nModel::create([
                        'parent_type' => get_class($model),
                        'parent_id'   => $model->getKey(),
                        'language'    => $variant['language'],
                        'formality'   => $variant['formality'],
                        'text'        => $value['text'],
                    ]);
                }
            } else {
                // Update specific variant
                I18nModel::updateOrCreate(
                    [
                        'parent_type' => get_class($model),
                        'parent_id'   => $model->getKey(),
                        'language'    => $value['language'],
                        'formality'   => $value['formality'] ?? 'formal',
                    ],
                    [
                        'text' => $value['text'],
                    ]
                );
            }

            return $this->markerValue;
        }

        // Plain string value - if currently localized, remove all i18n records
        if ($model->exists && $model->getRawOriginal($key) === $this->markerValue) {
            I18nModel::where([
                'parent_type' => get_class($model),
                'parent_id'   => $model->getKey(),
            ])->delete();
        }

        // Store as plain value
        return $value;
    }
}
