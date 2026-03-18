<?php

namespace App\Models;

use App\Enums\InvoiceItemType;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Expense extends BaseModel {
    use HasFactory;

    protected $casts   = ['price' => 'double'];
    protected $access  = ['admin' => '*', 'project_manager'=>'', 'user'=>''];

    public function category() {
        return $this->belongsTo(ExpenseCategory::class);
    }
    public function invoiceItem() {
        return $this->belongsTo(InvoiceItem::class);
    }
    public function yearlySum() {
        switch ($this->repeat) {
            case InvoiceItemType::Daily: return $this->price * 365;
            case InvoiceItemType::Weekly: return $this->price * 52;
            case InvoiceItemType::Monthly: return $this->price * 12;
            case InvoiceItemType::Quarterly: return $this->price * 4;
            case InvoiceItemType::Yearly: return $this->price;
        }
        return 0;
    }
}
