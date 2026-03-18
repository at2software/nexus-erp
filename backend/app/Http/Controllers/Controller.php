<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController {
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;

    protected $exceptedMiddlewares = [];

    protected function hookMiddleware($name): void {}
    public function response501() {
        return response(null, 501);
    }
    public function getBody() {
        return json_decode(request()->getContent());
    }
    public function updateParametersFromRequest(Request $request, Model $model): Model {
        $input = $this->body($request);
        foreach ($input as $key => $value) {
            $model->$key = $value;
        }
        return $model;
    }
    public function addRequestVariablesToBuilder(Builder $builder, Request $request) {
        return $builder->where($request->all() + ['index'=>'value']);
    }
    protected function applyCarbon(Builder $query, Request $request, string $field, string $input, string $cmp = '>') {
        if ($request->$input && $request->$input != 'undefined') {
            return $query->where($field, $cmp, Carbon::createFromFormat('d.m.Y', $request->$input));
        }
        return $query;
    }
    public function permissionsMiddleware() {
        return 'crud_role';
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
