<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use ReflectionClass;
use Schema;

class ResetPrecomputedValues extends Command {
    protected $signature   = 'app:reset-precomputed-values';
    protected $description = 'This command resets all precomputed values to null and recalculates them';

    public function handle() {
        $modelPath  = app_path('Models');
        $modelFiles = collect(glob($modelPath.'/*.php'))
            ->map(function ($file) {
                return 'App\\Models\\'.basename($file, '.php');
            })
            ->filter(function ($class) {
                $valid = false;
                if (class_exists($class) && is_subclass_of($class, Model::class) && Schema::hasTable(@(new $class)->getTable())) {
                    $reflection = new ReflectionClass($class);
                    $valid      = $reflection->isSubclassOf(Model::class) && ! $reflection->isAbstract();
                }
                return $valid;
            });

        foreach ($modelFiles->values() as $class) {
            $model = new $class;
            if (method_exists($model, 'resetPrecomputedAttributes')) {
                if (count($model->getPrecomputedAttributes())) {
                    echo "Resetting precomputed values for $class\n";
                    $model::all()->each(fn ($m) => $m->resetPrecomputedAttributes());
                }
            }
        }
    }
    public function update($class, $key) {
        $class::whereNotNull($key)->update([$key => null]);
    }
}
