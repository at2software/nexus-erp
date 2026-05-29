<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitlabAuditProject extends Model {
    protected $fillable = ['gitlab_url', 'namespace_with_path', 'project_name', 'gitlab_project_id', 'company_id', 'invoice_item_id'];

    public function company() {
        return $this->belongsTo(Company::class);
    }
    public function invoiceItem() {
        return $this->belongsTo(InvoiceItem::class);
    }
}
