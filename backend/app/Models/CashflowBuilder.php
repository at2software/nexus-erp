<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class CashflowBuilder {
    private $_collection;
    private array $closures;
    private array $appends;

    /**
     * @param array $appends Attributes to append to models
     * @param \Closure(Model): float ...$closures Named closures
     */
    public function __construct(
        public Builder $builder,
        array $appends = [],
        \Closure ...$closures
    ) {
        $this->closures = $closures;
        $this->appends  = $appends;
    }

    public function collection() {
        return $this->_collection ??= $this->builder->get();
    }
    public function getAndAppend() {
        $collection = $this->collection();
        if (! empty($this->appends)) {
            $collection->each->append($this->appends);
        }
        if (isset($this->closures['sum'])) {
            $collection->each(fn ($model) => $model->cashflow_value = (float)($this->closures['sum'])($model));
        }
        return $collection;
    }
    public function __get(string $name) {
        if (str_starts_with($name, 'get') && strlen($name) > 3) {
            $closureName = lcfirst(substr($name, 3));
            if (isset($this->closures[$closureName])) {
                return $this->collection()->sum(fn ($model) => ($this->closures[$closureName])($model));
            }
        }
        throw new \Exception("Property {$name} does not exist on CashflowBuilder");
    }
}
