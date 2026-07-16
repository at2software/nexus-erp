<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController {
    use AuthorizesRequests;

    protected $exceptedMiddlewares = [];

    protected function hookMiddleware($name): void {}
    public function response501() {
        return response(null, 501);
    }
    public function getBody() {
        $payload = request()->all();
        if ($payload === []) {
            return null;
        }
        return json_decode(json_encode($payload));
    }
    protected function applyCarbon(Builder $query, Request $request, string $field, string $input, string $cmp = '>') {
        if ($request->$input && $request->$input != 'undefined') {
            return $query->where($field, $cmp, Carbon::createFromFormat('d.m.Y', $request->$input));
        }
        return $query;
    }
    protected function maxUpdatedFor(...$models): ?Carbon {
        $max = null;
        foreach ($this->forcedArray($models) as $model) {
            $updatedAt = is_a($model, Relation::class) ? $model->maxCarbon('updated_at') : $model::maxCarbon('updated_at');
            $max       = $max ? $max->max($updatedAt) : $updatedAt;
        }
        return $max;
    }
    protected function forcedArray($obj): array {
        return is_array($obj) ? $obj : [$obj];
    }
}
