<?php

namespace App\Traits;

use App\Builders\BaseBuilder;
use App\Models\Param;
use Carbon\Carbon;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;

trait ParamDataTrait {
    use HasFactory;

    public static function getLatestValuesWithKeys($poly) {
        $model = new static;
        $table = $model->getTable();

        try {
            $query = DB::table($table.' as t')
                ->join('params as p', 't.param_id', '=', 'p.id')
                ->select('p.key', 't.value')
                ->where($poly);

            // Build the whereRaw condition properly
            $bindings   = [];
            $conditions = [];

            if (is_null($poly['parent_id'])) {
                $conditions[] = 'parent_id IS NULL';
            } else {
                $conditions[] = 'parent_id = ?';
                $bindings[]   = $poly['parent_id'];
            }

            if (is_null($poly['parent_type'])) {
                $conditions[] = 'parent_type IS NULL';
            } else {
                $conditions[] = 'parent_type = ?';
                $bindings[]   = $poly['parent_type'];
            }

            $whereClause = implode(' AND ', $conditions);

            $results = $query->whereRaw("t.id = (
                SELECT MAX(id) 
                FROM {$table} 
                WHERE param_id = t.param_id 
                AND {$whereClause}
            )", $bindings)->get();
            return $results;
        } catch (\Exception $e) {
            // Fallback to empty collection if query fails
            return collect([]);
        }
    }
    public static function getLatestGlobalValuesWithKeys() {
        $model = new static;
        $table = $model->getTable();
        return DB::table($table.' as t')
            ->join('params as p', 't.param_id', '=', 'p.id')
            ->select('p.key', 't.value')
            ->whereNull('t.parent_id')
            ->whereNull('t.parent_type')
            ->whereRaw("t.id = (SELECT MAX(id) FROM {$table} WHERE param_id = t.param_id AND parent_id IS NULL AND parent_type IS NULL)")
            ->get();
    }
    public function parent() {
        return $this->morphTo();
    }
    public function base() {
        return $this->belongsTo(Param::class, 'param_id');
    }
    public function getKeyAttribute() {
        return $this->base->key;
    }
    public function newEloquentBuilder($query) {
        return new ParamBuilder($query);
    }
    public function newCollection(array $models = []): ParamsCollection {
        return new ParamsCollection($models);
    }
}

class ParamBuilder extends BaseBuilder {
    /**
     * @param string|null $cluster group param history by DATE_FORMAT
     * @return BaseBuilder
     */
    public function clusteredBy(?string $cluster = null) {
        if ($cluster) {
            $cluster = Param::dateFormatFor($cluster);
            return $this->select('*', DB::raw("DATE_FORMAT(created_at, '$cluster') AS `cluster`"))
                ->selectRaw('MIN(value) AS min, MAX(value) AS max')
                ->groupBy('cluster');
        } else {
            return $this->select('*');
        }
    }

    public function sinceUnix(?string $unix) {
        return $unix ? $this->where('created_at', '>', Carbon::createFromTimestamp($unix)->toDateTimeString()) : $this;
    }
    public function latestForParam() {
        return $this->latest()->groupBy('param_id');
    }
    public function selectLatest($fn) {
        $subQuery = $fn(Param::query());
        return $this;
        // return $this->
    }
    public function index($poly): Builder {
        $table = $this->getModel()->getTable();

        // Subquery to get the latest IDs per param_id
        $latestIdsQuery = DB::table($table)
            ->selectRaw('MAX(id) as latest_id')
            ->where($poly)
            ->groupBy('param_id');
        return $this
            ->whereIn("$table.id", function ($query) use ($latestIdsQuery) {
                $query->select('latest_id')->fromSub($latestIdsQuery, 'latest_table');
            });
    }
    public function whereKey($key) {
        return $this->with('base')->where('base.key', $key);
    }
}
class ParamsCollection extends Collection {
    // public function sinceUnix(string|null $unix) { return $unix ? $this->where('created_at', '>', Carbon::createFromTimestamp($unix)->toDateTimeString()) : $this; }
}
