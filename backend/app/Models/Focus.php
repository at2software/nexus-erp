<?php

namespace App\Models;

use App\Builders\FocusBuilder;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Focus extends BaseModel {
    use HasFactory;

    protected $fillable = ['created_at', 'started_at', 'updated_at', 'user_id', 'parent_id', 'parent_type', 'duration', 'comment', 'invoice_item_id', 'invoiced_in_item_id', 'is_unpaid'];

    // protected $hidden = ['project', 'company'];
    protected $appends = ['class', 'icon', 'path'];
    protected $casts   = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
        'is_unpaid'  => 'boolean',
    ];
    protected $touches = ['user', 'parent'];
    protected $access  = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    public function parent() {
        return $this->morphTo();
    }
    public function user() {
        return $this->belongsTo(User::class);
    }
    public function invoiceItem() {
        return $this->belongsTo(InvoiceItem::class);
    }
    public function invoicedInItem() {
        return $this->belongsTo(InvoiceItem::class, 'invoiced_in_item_id');
    }
    public function getParentNameAttribute() {
        return $this->parent->name;
    }
    public function getParentPathAttribute() {
        return $this->parent->path;
    }
    public function getParentIconAttribute() {
        if ($this->parent) {
            return $this->parent->icon;
        }
        return $this->user?->icon ?? null;
    }
    public function getRootCompanyAttribute() {
        if (is_a($this->parent, Company::class)) {
            return $this->parent;
        }
        if (is_a($this->parent, Project::class)) {
            return $this->parent->company;
        }
        return null;
    }
    public function newEloquentBuilder($query) {
        return new FocusBuilder($query);
    }
}
