<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSchemaService {
    public function getTables(): array {
        $database       = config('database.connections.mysql.database');
        $excludedTables = ['sentinel_triggers', 'sentinel_users', 'failed_jobs', 'role_has_permissions', 'migrations', 'milestone_milestones', 'float_params', 'string_params', 'text_params', 'password_resets', 'translations', 'model_has_permissions', 'model_has_roles', 'permissions', 'roles', 'role_has_permission'];

        $excludePlaceholders = implode(',', array_fill(0, count($excludedTables), '?'));

        $tablesWithColumns = DB::select("
            SELECT
                t.TABLE_NAME as table_name,
                c.COLUMN_NAME as Field,
                c.DATA_TYPE as Type,
                c.IS_NULLABLE as `Null`,
                c.COLUMN_KEY as `Key`,
                c.COLUMN_DEFAULT as `Default`,
                c.EXTRA as Extra
            FROM INFORMATION_SCHEMA.TABLES t
            LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
            WHERE t.TABLE_SCHEMA = ?
            AND t.TABLE_TYPE = 'BASE TABLE'
            AND t.TABLE_NAME NOT IN ({$excludePlaceholders})
            ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
        ", array_merge([$database], $excludedTables));

        $tables       = [];
        $currentTable = null;

        foreach ($tablesWithColumns as $row) {
            if ($currentTable !== $row->table_name) {
                if ($currentTable !== null) {
                    $this->addMutatorColumns($tables[count($tables) - 1]);
                }
                $tables[]     = ['name' => $row->table_name, 'columns' => []];
                $currentTable = $row->table_name;
            }

            if ($row->Field) {
                $tables[count($tables) - 1]['columns'][] = [
                    'Field'   => $row->Field,
                    'Type'    => $row->Type,
                    'Null'    => $row->Null,
                    'Key'     => $row->Key,
                    'Default' => $row->Default,
                    'Extra'   => $row->Extra,
                ];
            }
        }

        if (! empty($tables)) {
            $this->addMutatorColumns($tables[count($tables) - 1]);
        }
        return $tables;
    }
    private function addMutatorColumns(&$tableNode): void {
        $model = '\\App\\Models\\'.Str::studly(Str::singular($tableNode['name']));
        if (class_exists($model)) {
            $o = new $model;
            if (method_exists($o, 'getMutators')) {
                foreach (@$o->getMutators() as $t) {
                    $tableNode['columns'][] = ['Field' => $t, 'Type' => 'int'];
                }
            }
        }
    }
}
