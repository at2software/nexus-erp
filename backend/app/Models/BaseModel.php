<?php

namespace App\Models;

use App\Enums\SentinelTriggerType;
use App\Services\SentinelTriggerService;
use App\Traits\CustomModelTrait;
use App\Traits\PrecomputedTrait;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BaseModel extends Model {
    public function first(): never {
        throw new HttpException(500, 'You are calling first() on a model instance which is probably not what you want.');
    }

    use CustomModelTrait;
    use HasFactory;
    use PrecomputedTrait;

    public array $__pendingI18n = [];
    protected $appends          = ['icon', 'class'];

    protected static function booted() {
        static::created(function ($model) {
            SentinelTriggerService::handleModelBasedTrigger(SentinelTriggerType::OnCreated, $model);
        });

        static::updated(function ($model) {
            SentinelTriggerService::handleModelBasedTrigger(SentinelTriggerType::OnUpdated, $model);
        });

        static::deleted(function ($model) {
            SentinelTriggerService::handleModelBasedTrigger(SentinelTriggerType::OnDeleted, $model);
        });
    }
    public function withRequest() {
        if (($w = request('with'))) {
            $with = explode(',', $w);
            foreach ($with as $_) {
                $this->load($_);
            }
        }
        return $this;
    }
    public function newCollection(array $models = []) {
        return new BaseCollection($models);
    }
    public function getAccess(): array {
        return $this->access ?? [];
    }

    /**
     * @param string $prefix "get" or "set"
     */
    private function attributeNameFor($prefix) {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 4);
        return Str::snake(lcfirst(preg_replace('/'.$prefix.'(.*)Attribute/is', '$1', $trace[2]['function'])));
    }

    public static function fromPath(?string $path, string $key = 'parent'): ?Model {
        if ($path === null) {
            return null;
        }
        $parts = explode('/', $path);
        if (count($parts) !== 2) {
            return null;
        }
        $className = 'App\\Models\\'.Str::studly(Str::singular($parts[0]));
        return $className::find($parts[1]);
    }
}

class BaseCollection extends Collection {
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
}

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
