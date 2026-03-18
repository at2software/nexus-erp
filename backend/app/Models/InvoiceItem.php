<?php

namespace App\Models;

use App\Builders\InvoiceItemBuilder;
use App\Enums\InvoiceItemType;
use App\Helpers\NLog;
use App\Http\Middleware\Auth;
use App\Traits\PrecomputedTrait;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class InvoiceItem extends BaseModel {
    use HasFactory;
    use PrecomputedTrait;

    const INFO_REDUCED = ['progress', 'id', 'text', 'qty', 'unit_name'];
    const ACTIVE       = ['inactive', 'active', 'optional'];

    protected $my_mutators = ['my_prediction'];
    protected $touches     = ['invoice', 'company', 'project'];
    protected $appends     = ['class', 'icon', 'path', 'progress'];
    protected $fillable    = [
        'company_id',
        'discount',
        'flags',
        'is_discountable',
        'next_recurrence_at',
        'position',
        'price',
        'product_id',
        'product_source_id',
        'project_id',
        'qty',
        'text',
        'type',
        'unit_name',
        'vat_calculation',
        'vat_rate',
        'vat_reason',
    ];
    protected $hides = ['deleted_at'];
    protected $casts = [
        'net'                => 'double',
        'gross'              => 'double',
        'qty'                => 'double',
        'discount'           => 'double',
        'price'              => 'double',
        'price_discounted'   => 'double',
        'vat_rate'           => 'double',
        'vat_rate_dec'       => 'double',
        'unit_factor'        => 'double',
        'total'              => 'double',
        'is_discountable'    => 'boolean',
        'next_recurrence_at' => 'date',
    ];
    protected $access = ['admin' => '*', 'project_manager' => 'cru', 'developer' => 'cru'];

    public function getDirty() { // Exclude virtual attributes from dirty tracking
        $dirty = parent::getDirty();
        unset($dirty['my_prediction']);
        return $dirty;
    }

    // #########
    // RELATIONS
    // #########

    public function project() {
        return $this->belongsTo(Project::class);
    }
    public function invoice() {
        return $this->belongsTo(Invoice::class);
    }
    public function invoiceItem() {
        return $this->belongsTo(InvoiceItem::class);
    }
    public function foci() {
        return $this->hasMany(Focus::class);
    }
    public function billedFoci() {
        return $this->hasMany(Focus::class, 'invoiced_in_item_id');
    }
    public function company() {
        return $this->belongsTo(Company::class);
    }
    public function product() {
        return $this->belongsTo(Product::class);
    }
    public function productSource() {
        return $this->belongsTo(Product::class, 'product_source_id', 'id');
    }
    public function companyContact() {
        return $this->belongsTo(CompanyContact::class);
    }
    public function predictions() {
        return $this->hasMany(InvoiceItemPrediction::class);
    }
    public function milestones() {
        return $this->belongsToMany(Milestone::class, 'invoice_item_milestone');
    }
    public function nonPercentualSiblings() {
        return InvoiceItem::where([
            'company_id' => $this->company_id,
            'project_id' => $this->project_id,
            'invoice_id' => $this->invoice_id,
            'type'       => InvoiceItemType::Default,
        ])->whereNot('unit_name', '%');
    }

    // ####################
    // ACCESSORS & MUTATORS
    // ####################

    protected function myPrediction(): Attribute {
        return Attribute::make(
            get: fn () => InvoiceItemPrediction::find(Auth::user()->id, $this->id)->value('qty'),
            set: function ($val) {
                NLog::info('setting my_prediction');
                $pred      = InvoiceItemPrediction::findOrCreate(Auth::user()->id, $this->id);
                $pred->qty = $val;
                $pred->save();
                return $this->fresh()->append('my_prediction');
            }
        );
    }
    protected function price(): Attribute {
        return Attribute::make(
            get: function ($value) {
                if ($this->unit_name === '%' && ! $this->invoice_id && ! $this->company_id && ! $this->type === InvoiceItemType::Paydown) {
                    return floatval($this->nonPercentualSiblings()->sum('total'));
                }
                return floatval($value);
            }
        );
    }
    protected function total(): Attribute {
        return Attribute::make(
            get: function ($value) {
                if ($this->unit_name === '%' && ! $this->invoice_id && ! $this->company_id && ! $this->type === InvoiceItemType::Paydown) {
                    return floatval($this->nonPercentualSiblings()->sum('total') * $this->qty * 0.01);
                }
                return floatval($value);
            }
        );
    }
    public function getFociSumAttribute() {
        return $this->foci()->sum('duration');
    }
    public function getBilledFociSumAttribute() {
        return $this->billedFoci()->sum('duration');
    }
    public function getFociByUserAttribute() {
        return $this->foci()
            ->selectRaw('user_id, SUM(duration) as duration')
            ->groupBy('user_id')
            ->get()
            ->map(fn($focus) => [
                'user_id' => $focus->user_id,
                'duration' => floatval($focus->duration)
            ])
            ->values();
    }
    public function getBilledFociCountAttribute() {
        return $this->billedFoci()->count();
    }
    public function getProgressAttribute() {
        $assumedWorkload = $this->assumedWorkload();
        if ($assumedWorkload == 0) {
            return 0;
        }
        $fociSum = $this->getFociSumAttribute();
        $result  = $fociSum / $assumedWorkload;
        return $result;
    }
    public static function regexWorkload() {
        return [
            '(hours?|hrs?|hr\.?|h|std\.?|stunden?)'                               => 1,
            '(days?|d|day|tage?|tag|pt|pts?\.?|mt|man[-\s]?day[s]?|arbeitstage?)' => Param::get('INVOICE_HPD')->value,
        ];
    }
    public function assumedWorkload(): float {
        if ($this->type !== InvoiceItemType::Default) {
            return 0;
        }
        if ($this->unit_name === '%') {
            $siblingsSum = $this->nonPercentualSiblings()->get()->reduce(fn (float $carry, InvoiceItem $_): float => $carry + $_->assumedWorkload(), 0);
            $val         = floatval($siblingsSum * 0.01 * $this->qty);
            return $val;
        }
        $r = self::regexWorkload();
        foreach ($r as $regex => $mult) {
            if (preg_match("/$regex/is", $this->unit_name)) {
                return floatval($this->qty * $mult);
            }
        }
        return 0;
    }
    public function newEloquentBuilder($query) {
        return new InvoiceItemBuilder($query);
    }
}
