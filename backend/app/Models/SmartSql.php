<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;

// thanks to https://dev.to/kodeas/bulk-update-multiple-records-with-separate-data-laravel-4j7k
class SmartSql {
    private $table;
    private $column;
    public $ids     = [];
    private $params = [];

    public function __construct($table, $column) {
        $this->table  = $table;
        $this->column = $column;
    }
    public function add($id, $val) {
        $this->params[] = $val;
        $this->ids[]    = $id;
    }
    private function cases() {
        return implode(' ', array_map(fn ($_) => "WHEN {$_} then ?", $this->ids));
    }
    public function isEmpty() {
        return count($this->ids) == 0;
    }
    public function toArray() {
        return ["UPDATE $this->table SET `$this->column` = CASE `id` ".$this->cases().' END WHERE `id` in ('.implode(',', $this->ids).')', $this->params];
    }
    public function save() {
        $this->isEmpty() || DB::update(...$this->toArray());
    }
}
