<?php

namespace App\Builders;

use App\Helpers\NLog;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class BaseBuilder extends Builder {
    public function maxCarbon($field = 'created_at'): ?Carbon {
        $max = $this->max($field);
        if (! $max) {
            return null;
        }
        return Carbon::parse($max);
    }
    public function selectCluster($keyColumn, $valueColumn, $format='%Y-%m') {
        return $this->selectRaw("DATE_FORMAT($keyColumn, '$format') `key`, SUM($valueColumn) `value`");
    }
    public function clusterBy($column = 'created_at', $format = '%Y-%m', $sumColumn = 'net', $key = 'month', $sumKey = 'sum'): BaseBuilder {
        return $this->select(DB::raw("DATE_FORMAT($column, '$format') AS $key"), DB::raw("SUM($sumColumn) AS sum"))->groupBy($key);
    }
    public function latestOfCluster(string $column = 'created_at', string $format = '%Y-%m-%d', $additionalWhere = '') {
        $table = $this->getModel()->getTable();
        return $this->getModel()->select(DB::raw('t.*'))
            ->fromRaw("(SELECT *, DATE_FORMAT($column, '$format') AS day FROM $table $additionalWhere ORDER BY $column DESC) t")
            ->groupBy('t.day');
    }
    public function since(Carbon $date, string $column = 'created_at') {
        return $this->where($column, '>', $date);
    }
    public function whereBetweenString(?string $twoDates = null, string $column = 'created_at') {
        if (! $twoDates) {
            return $this;
        }
        if ($twoDates == null) {
            return $this;
        }
        if ($twoDates == 'null') {
            return $this;
        }
        $d = explode(',', $twoDates);
        if (count($d) < 2) {
            return $this;
        }
        $startDate = Carbon::createFromFormat('d.m.Y', $d[0])->startOfDay()->toDateString();
        $endDate   = Carbon::createFromFormat('d.m.Y', $d[1])->endOfDay()->toDateString();
        $this->whereBetween($column, [$startDate, $endDate]);
        return $this;
    }
    public function whereAfter(Carbon $date, string $column = 'created_at') {
        $this->where($column, '>', $date);
        return $this;
    }
    public function whereBefore(Carbon $date, string $column = 'created_at') {
        $this->where($column, '<', $date);
        return $this;
    }
    public function whereLike($column, $like) {
        return $this->whereRaw("UPPER($column) LIKE '%".strtoupper($like)."%'");
    }
    public function whereFlag(int $flag, string $column = 'flags', $cmp = '='): BaseBuilder {
        return $this->whereRaw("`$column` & $flag $cmp $flag");
    }
    public function toSqlWithBindings(): string {
        return vsprintf(str_replace('?', '%s', $this->toSql()), collect($this->getBindings())->map(function ($binding) {
            $binding = addslashes($binding);
            return is_numeric($binding) ? $binding : "'{$binding}'";
        })->toArray());
    }

    /**
     * automatically tries to apply matching colum values from request as select clause
     */
    public function whereRequest() {
        $tableName = $this->getModel()->getTable();
        foreach (request()->all() as $colName => $value) {
            if ($this->getModel()->getConnection()->getSchemaBuilder()->hasColumn($tableName, $colName)) {
                $type = DB::getSchemaBuilder()->getColumnType($tableName, $colName);
                switch ($type) {
                    case 'boolean':
                    case 'integer':
                    case 'int':
                    case 'tinyint':
                        $array = explode(',', $value);
                        $this->whereIn($colName, $array);
                        break;
                    case 'date':
                    case 'datetime':
                        $this->whereBetweenString($value, $colName);
                        break;
                    default:
                        NLog::alert("unsupported column selector $type for column `$colName`");
                }
            }
        }
        return $this;
    }

    public function whereMorph($obj, $key='parent') {
        return $this->where($key.'_type', get_class($obj))->where($key.'_id', $obj->id);
    }
    public function withRequest(): Builder {
        if (! ($w = request('with'))) {
            return $this;
        }
        $with = explode(',', $w);
        if (count($with)) {
            $this->with($with);
        }
        return $this;
    }
    public function applyRequest(): Builder {
        foreach (request()->all() as $name => $value) {
            if (method_exists($this, $name)) {
                call_user_func_array([$this, $name], array_filter([$value]));
            }
        }
        return $this;
    }
    public function appendRequest() {
        if (! ($a = request('append'))) {
            return $this;
        }
        $appends = explode(',', $a);
        if (! count($appends)) {
            return $this;
        }
        return $this->append($appends);
    }

    /**
     * Pick the latest entry from a pivot table based on a column (default: id)
     *
     * @param string|null $pivotTable The pivot table name (auto-detected if null)
     * @param string $groupByColumn The column to group by in the pivot table
     * @param string $orderColumn The column to order by (default: 'id')
     */
    public function pickLatest(?string $pivotTable = null, ?string $groupByColumn = null, string $orderColumn = 'id'): BaseBuilder {
        [$pivotTable, $groupByColumn] = $this->resolvePivotParams($pivotTable, $groupByColumn);
        $alias                        = $this->generateAlias($pivotTable);
        return $this->whereRaw("$pivotTable.$orderColumn = (
            SELECT MAX($alias.$orderColumn)
            FROM $pivotTable AS $alias
            WHERE $alias.$groupByColumn = $pivotTable.$groupByColumn
        )");
    }

    /**
     * Pick the latest entry with polymorphic conditions using correlated subquery
     *
     * @param string $groupByColumn Column to group by (e.g., 'param_id')
     * @param string|null $polyClass The polymorphic class to filter by (e.g., 'App\Models\User')
     * @param string $orderColumn Column to order by for MAX selection (default: 'id')
     * @param string $polyColumn Base name of polymorphic columns (default: 'parent' for parent_id/parent_type)
     */
    public function pickLatestWithConditions(string $groupByColumn, ?string $polyClass = null, string $orderColumn = 'id', $polyColumn = 'parent'): BaseBuilder {
        $table = $this->getModel()->getTable();
        return $this
            ->whereRaw("{$orderColumn} IN (
                SELECT MAX({$orderColumn}) 
                FROM {$table} AS sub 
                WHERE sub.{$polyColumn}_type = ? 
                AND sub.{$polyColumn}_id = {$table}.{$polyColumn}_id 
                GROUP BY sub.{$groupByColumn}
            )", [$polyClass]);
    }

    /**
     * Pick the oldest entry from a pivot table based on a column (default: id)
     *
     * @param string|null $pivotTable The pivot table name (auto-detected if null)
     * @param string $groupByColumn The column to group by in the pivot table
     * @param string $orderColumn The column to order by (default: 'id')
     */
    public function pickOldest(?string $pivotTable = null, ?string $groupByColumn = null, string $orderColumn = 'id'): BaseBuilder {
        [$pivotTable, $groupByColumn] = $this->resolvePivotParams($pivotTable, $groupByColumn);
        $alias                        = $this->generateAlias($pivotTable);
        return $this->whereRaw("$pivotTable.$orderColumn = (
            SELECT MIN($alias.$orderColumn)
            FROM $pivotTable AS $alias
            WHERE $alias.$groupByColumn = $pivotTable.$groupByColumn
        )");
    }

    /**
     * Resolve pivot table parameters automatically if not provided
     */
    private function resolvePivotParams(?string $pivotTable, ?string $groupByColumn): array {
        if ($pivotTable && $groupByColumn) {
            return [$pivotTable, $groupByColumn];
        }

        // Try to auto-detect from model relationship or table name
        $modelTable = $this->getModel()->getTable();

        if (! $pivotTable) {
            // For models like ProjectState, try to detect pivot table name
            $modelClass = get_class($this->getModel());
            $modelName  = class_basename($modelClass);

            // Convert ProjectState -> project_state, then try common patterns
            $tableName = strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $modelName));

            // Try to find related table pattern (like project_project_state)
            if (str_contains($tableName, '_')) {
                $parts = explode('_', $tableName);
                if (count($parts) >= 2) {
                    $pivotTable = $parts[0].'_'.$tableName;
                }
            }
        }

        if (! $groupByColumn && $pivotTable) {
            // Extract the first part before underscore + _id
            $firstPart     = explode('_', $pivotTable)[0];
            $groupByColumn = $firstPart.'_id';
        }

        // Fallback: use model table name if we still don't have values
        if (! $pivotTable) {
            $pivotTable = $modelTable;
        }

        if (! $groupByColumn) {
            $groupByColumn = 'id'; // Ultimate fallback
        }
        return [$pivotTable, $groupByColumn];
    }

    /**
     * Generate a short alias for the table name
     */
    private function generateAlias(string $tableName): string {
        $parts = explode('_', $tableName);
        return implode('', array_map(fn ($part) => substr($part, 0, 1), $parts));
    }
}
