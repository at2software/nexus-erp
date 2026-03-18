<?php

namespace App\Models;

use App\Casts\PrecomputedAuth;
use App\Traits\HasInvoiceItemsTrait;
use App\Traits\PrecomputedTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class Product extends BaseModel {
    use HasFactory;
    use HasInvoiceItemsTrait;
    use PrecomputedTrait;
    use SoftDeletes;

    protected $appends  = ['icon', 'class', 'path', 'rootGroup'];
    protected $fillable = ['name', 'unit_name', 'is_active', 'is_discountable', 'vat', 'recurrence', 'product_group_id', 'created_at', 'updated_at'];
    protected $touches  = ['group'];
    protected $casts    = [
        'net'     => PrecomputedAuth::class,
    ];
    protected $access = ['admin' => '*', 'project_manager'=>'r', 'user'=>'r'];

    public function getIconAttribute() {
        return '../icons/product.jpg';
    }
    public function getRootGroupAttribute() {
        $group = $this->group()->first();
        while ($next = $group->parent_group()->first()) {
            $group = $next;
        }
        return $group;
    }
    public function precomputeNetAttribute() {
        return $this->refs()->sum('net');
    }
    public function group() {
        return $this->belongsTo(ProductGroup::class, 'product_group_id');
    }
    public function refs() {
        return $this->hasMany(InvoiceItem::class, 'product_source_id')->where('invoice_id', '>', 0);
    }
    public function customers() {
        return $this->refs()->whereHas('invoice')->with('invoice.company');
    }
    public function invoiceItems() {
        return $this->hasMany(InvoiceItem::class, 'product_id');
    }
    public function indexedItems() {
        return $this->invoiceItems()->with('productSource')->oldest('position');
    }
    public function trace(): Collection {
        $data = collect();
        $obj  = $this->group;
        while ($obj) {
            $data->push($obj);
            $obj = $obj->parent_group;
        }
        return $data;
    }
    public function activate(bool $is_active) {
        $this->is_active = $is_active;
        $this->save();
        return $this;
    }
}
