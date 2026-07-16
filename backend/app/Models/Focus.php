<?php

namespace App\Models;

use App\Builders\FocusBuilder;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Focus extends BaseModel {
    use HasFactory;

    protected $fillable = ['created_at', 'started_at', 'updated_at', 'user_id', 'parent_id', 'parent_type', 'duration', 'comment', 'invoice_item_id', 'invoiced_in_item_id', 'is_unpaid', 'ext_issue_plugin_link_id', 'ext_issue_id'];

    // protected $hidden = ['project', 'company'];
    protected $appends = ['class', 'icon', 'path'];

    protected function casts(): array {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at'   => 'datetime',
            'is_unpaid'  => 'boolean',
        ];
    }

    // Cascades a save to the parent (Project or Company), which broadcasts itself as 'updated'.
    protected $touches = ['user', 'parent'];

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
    public function extIssuePluginLink() {
        return $this->belongsTo(PluginLink::class, 'ext_issue_plugin_link_id');
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
