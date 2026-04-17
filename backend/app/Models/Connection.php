<?php

namespace App\Models;

use App\Casts\PrecomputedAuth;
use App\Enums\InvoiceItemType;
use App\Traits\PrecomputedTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Connection extends BaseModel {
    use HasFactory;
    use PrecomputedTrait;

    protected $with     = ['company1', 'company2'];
    protected $casts    = ['net' => PrecomputedAuth::class];
    protected $fillable = ['company1_id', 'company2_id'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    public static function obfuscateNet($connections) {
        return $connections->map(function ($conn) {
            $data = $conn->toArray();
            foreach (['company1', 'company2'] as $company) {
                if (isset($data[$company]['net'])) {
                    $net                   = $data[$company]['net'];
                    $data[$company]['net'] = $net > 0 ? round(log10($net), 2) : 0;
                }
            }
            return $data;
        });
    }
    public function getOtherCompany($companyId) {
        return ($this->company1_id == $companyId) ? $this->company2 : $this->company1;
    }
    public function company1() {
        return $this->belongsTo(Company::class, 'company1_id');
    }
    public function company2() {
        return $this->belongsTo(Company::class, 'company2_id');
    }
    public function projects() {
        return $this->hasMany(ConnectionProject::class);
    }
    public function precomputeNetAttribute() {
        return 0;
        if ($this->has('projects') === null) {
            return 0;
        }
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::Total)->sum('invoice_items.net');
    }
}
