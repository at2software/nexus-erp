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
    public function selectCluster($keyColumn, $valueColumn, $format = '%Y-%m') {
        $key   = $this->getQuery()->getGrammar()->wrap($keyColumn);
        $value = $this->getQuery()->getGrammar()->wrap($valueColumn);
        return $this->selectRaw("DATE_FORMAT($key, ?) `key`, SUM($value) `value`", [$this->safeFormat($format)]);
    }
    public function clusterBy($column = 'created_at', $format = '%Y-%m', $sumColumn = 'net', $key = 'month', $sumKey = 'sum'): BaseBuilder {
        $col         = $this->wrapColumnOrExpression($column);
        $sum         = $this->getQuery()->getGrammar()->wrap($sumColumn);
        $keyAlias    = $this->safeAlias($key);
        $sumKeyAlias = $this->safeAlias($sumKey);
        return $this->selectRaw("DATE_FORMAT($col, ?) AS $keyAlias, SUM($sum) AS $sumKeyAlias", [$this->safeFormat($format)])->groupBy($keyAlias);
    }
    public function latestOfCluster(string $column = 'created_at', string $format = '%Y-%m-%d'): BaseBuilder {
        $g     = $this->getQuery()->getGrammar();
        $col   = $g->wrap($column);
        $table = $g->wrapTable($this->getModel()->getTable());
        return $this->getModel()->select(DB::raw('t.*'))
            ->fromRaw("(SELECT *, DATE_FORMAT($col, ?) AS day FROM $table ORDER BY $col DESC) t", [$this->safeFormat($format)])
            ->groupBy('t.day');
    }
    public function since(Carbon $date, string $column = 'created_at') {
        return $this->where($column, '>', $date);
    }
    public function whereBetweenString(?string $twoDates = null, string $column = 'created_at') {
        if (! $twoDates || $twoDates === 'null') {
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
    public function whereLike(string $column, string $like): static {
        $col = $this->getQuery()->getGrammar()->wrap($column);
        return $this->whereRaw("UPPER($col) LIKE CONCAT('%', UPPER(?), '%')", [$like]);
    }
    public function whereFlag(int $flag, string $column = 'flags', $cmp = '='): BaseBuilder {
        $col = $this->getQuery()->getGrammar()->wrap($column);
        return $this->whereRaw("$col & ? {$this->safeCmp($cmp)} ?", [$flag, $flag]);
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
        $allowedFilters = $this->getModel()->allowedFilters ?? [];

        // Secure by default: skip filtering entirely when no allowlist is declared
        if (! count($allowedFilters)) {
            return $this;
        }

        $tableName   = $this->getModel()->getTable();
        $columnTypes = $this->cachedColumnTypes($tableName);
        foreach (request()->all() as $colName => $value) {
            if (! in_array($colName, $allowedFilters, true) || ! array_key_exists($colName, $columnTypes)) {
                continue;
            }
            $type = $columnTypes[$colName];
            switch ($type) {
                case 'boolean':
                case 'integer':
                case 'int':
                case 'tinyint':
                    $this->whereIn($colName, explode(',', $value));
                    break;
                case 'date':
                case 'datetime':
                    $this->whereBetweenString($value, $colName);
                    break;
                default:
                    NLog::alert("unsupported column selector $type for column `$colName`");
            }
        }
        return $this;
    }

    public function whereMorph($obj, $key = 'parent') {
        return $this->where($key.'_type', $obj::class)->where($key.'_id', $obj->id);
    }
    public function withRequest(): Builder {
        if (! ($w = request('with'))) {
            return $this;
        }
        $with    = explode(',', $w);
        $allowed = $this->getModel()->allowedWith ?? [];
        if (count($allowed)) {
            $with = array_intersect($with, $allowed);
        }
        if (count($with)) {
            $this->with($with);
        }
        return $this;
    }
    public function applyRequest(): Builder {
        $allowed = $this->getModel()->allowedScopes ?? [];
        foreach (request()->all() as $name => $value) {
            if (in_array($name, $allowed, true) && method_exists($this, $name)) {
                call_user_func_array([$this, $name], array_filter([$value]));
            }
        }
        return $this;
    }
    public function appendRequest(): static {
        if (! ($a = request('append'))) {
            return $this;
        }
        $appends = explode(',', $a);
        $allowed = $this->getModel()->allowedAppends ?? [];
        if (count($allowed)) {
            $appends = array_intersect($appends, $allowed);
        }
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
        $g                            = $this->getQuery()->getGrammar();
        $wTable                       = $g->wrapTable($pivotTable);
        $wAlias                       = $g->wrapTable($alias);
        $wOrder                       = $g->wrap($orderColumn);
        $wGroup                       = $g->wrap($groupByColumn);
        return $this->whereRaw("$wTable.$wOrder = (
            SELECT MAX($wAlias.$wOrder)
            FROM $wTable AS $wAlias
            WHERE $wAlias.$wGroup = $wTable.$wGroup
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
        $table      = $this->getModel()->getTable();
        $g          = $this->getQuery()->getGrammar();
        $wTable     = $g->wrapTable($table);
        $wSub       = $g->wrapTable('sub');
        $wOrder     = $g->wrap($orderColumn);
        $wGroup     = $g->wrap($groupByColumn);
        $wPolyId    = $g->wrap($polyColumn.'_id');
        $wPolyType  = $g->wrap($polyColumn.'_type');
        return $this->whereRaw("{$wOrder} IN (
                SELECT MAX({$wOrder})
                FROM {$wTable} AS {$wSub}
                WHERE {$wSub}.{$wPolyType} = ?
                AND {$wSub}.{$wPolyId} = {$wTable}.{$wPolyId}
                GROUP BY {$wSub}.{$wGroup}
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
        $g                            = $this->getQuery()->getGrammar();
        $wTable                       = $g->wrapTable($pivotTable);
        $wAlias                       = $g->wrapTable($alias);
        $wOrder                       = $g->wrap($orderColumn);
        $wGroup                       = $g->wrap($groupByColumn);
        return $this->whereRaw("$wTable.$wOrder = (
            SELECT MIN($wAlias.$wOrder)
            FROM $wTable AS $wAlias
            WHERE $wAlias.$wGroup = $wTable.$wGroup
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
            $modelName = class_basename($this->getModel()::class);

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

    private function wrapColumnOrExpression(string $column): string {
        // If the value contains spaces or parentheses it is a SQL expression — pass through as-is
        if (preg_match('/[\s\(\)]/', $column)) {
            return $column;
        }
        return $this->getQuery()->getGrammar()->wrap($column);
    }
    private function safeFormat(string $format): string {
        if (! preg_match('/^[%a-zA-Z0-9\-:\/\. ]+$/', $format)) {
            throw new \InvalidArgumentException("Invalid DATE_FORMAT string: {$format}");
        }
        return $format;
    }
    private function safeAlias(string $alias): string {
        if (! preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $alias)) {
            throw new \InvalidArgumentException("Invalid SQL alias: {$alias}");
        }
        return $alias;
    }
    private function safeCmp(string $cmp): string {
        $allowed = ['=', '!=', '<>', '<', '>', '<=', '>='];
        if (! in_array($cmp, $allowed, true)) {
            throw new \InvalidArgumentException("Invalid comparison operator: {$cmp}");
        }
        return $cmp;
    }

    private static array $columnTypeCache = [];

    private function cachedColumnTypes(string $tableName): array {
        if (! isset(static::$columnTypeCache[$tableName])) {
            $schema                              = $this->getModel()->getConnection()->getSchemaBuilder();
            $columns                             = $schema->getColumnListing($tableName);
            static::$columnTypeCache[$tableName] = collect($columns)
                ->mapWithKeys(fn ($col) => [$col => $schema->getColumnType($tableName, $col)])
                ->all();
        }
        return static::$columnTypeCache[$tableName];
    }
}
