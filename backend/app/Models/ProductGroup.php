<?php

namespace App\Models;

use App\Casts\PrecomputedAuth;
use App\Traits\PrecomputedTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;

class ProductGroup extends BaseModel {
    use HasFactory;
    use PrecomputedTrait;

    protected $fillable = ['name', 'color', 'product_group_id', 'created_at', 'updated_at'];
    protected $touches  = ['parent_group'];
    protected $appends  = ['class', 'icon', 'path'];
    protected $access   = ['admin' => '*', 'project_manager'=>'r', 'user'=>'r'];
    protected $casts    = [
        'net'     => PrecomputedAuth::class,
    ];

    public function parent_group() {
        return $this->belongsTo(ProductGroup::class);
    }
    public function child_groups() {
        return $this->hasMany(ProductGroup::class);
    }
    public function products() {
        return $this->hasMany(Product::class);
    }
    public function products_min() {
        return $this->products()->latest('is_active')->without(['invoiceItems']);
    }
    public function precomputeNetAttribute() {
        return $this->products()->sum('net') + $this->child_groups()->sum('net');
    }
    public function flatTraceProducts() {
        $d = $this->products;
        foreach ($this->child_groups as $c) {
            $d = $d->merge($c->flatTraceProducts());
        }
        return $d;
    }
    public function getAllDescendantIds() {
        $descendants = collect();
        foreach ($this->child_groups as $child) {
            $descendants->push($child->id);
            $descendants = $descendants->merge($child->getAllDescendantIds());
        }
        return $descendants;
    }

    // API
    public static function _indexAll($id) {
        $results = [];
        $query   = ProductGroup::with([
            'products' => function ($query) {
                $query
                    ->withSum('refs AS revenue', DB::raw('invoice_items.price * invoice_items.qty'))
                    ->withMax('refs AS last_used_at', 'created_at')
                    ->groupBy('id')
                    ->latest('revenue');
            }])
            ->where('product_group_id', $id);

        $groups = $query->get();
        foreach ($groups as $p) {
            $results[] = [
                'id'              => $p->id,
                'parent_group_id' => $p->parent_group_id,
                'name'            => $p->name,
                'color'           => $p->color,
                'groups'          => ProductGroup::_indexAll($p->id),
                'products'        => $p->products,
            ];
        }
        return $results;
    }
    public function activate(bool $is_active) {
        $this->is_active = $is_active;
        $this->save();
        $this->child_groups->each(function ($g) use ($is_active) { $g->activate($is_active); });
        $this->products->each(function ($g) use ($is_active) { $g->activate($is_active); });
        return $this;
    }
    public static function indexAll() {
        return ProductGroup::_indexAll(null);
    }
}
