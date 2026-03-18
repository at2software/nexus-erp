<?php

namespace App\Models;

use App\Actions\CancelInvoiceAction;
use App\Builders\InvoiceBuilder;
use App\Casts\CurrencyFormatCast;
use App\Casts\PrecomputedAuth;
use App\Enums\InvoiceItemType;
use App\Jobs\SendInvoiceMailJob;
use App\Jobs\SendInvoiceReminderJob;
use App\Services\InvoiceItemEnhancementService;
use App\Traits\HasInvoiceItemsTrait;
use App\Traits\PrecomputedTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends BaseModel {
    use HasFactory;
    use HasInvoiceItemsTrait;
    use PrecomputedTrait;
    use SoftDeletes;

    const kNET                    = 'Nettowert';
    const kGROSS                  = 'Bruttowert';
    const FLAG_SENT_TO_DATEV      = 1;
    const ITEMS_WITH_NUMBER       = [InvoiceItemType::Default, InvoiceItemType::Discount];
    const ITEMS_ADDING_TO_PROJECT = [InvoiceItemType::Default, InvoiceItemType::Discount];
    const ITEMS_ADDING_TO_INVOICE = [InvoiceItemType::Default, InvoiceItemType::Discount, InvoiceItemType::Paydown];
    const ITEMS_NEED_INFO         = [...self::ITEMS_ADDING_TO_INVOICE, InvoiceItemType::Optional];

    protected $touches  = ['company'];
    protected $appends  = ['class', 'icon', 'path', 'net', 'gross', 'gross_remaining'];
    protected $fillable = ['due_at', 'remind_at', 'company_id', 'default_interest', 'file_dir', 'name'];
    protected $casts    = [
        'net'             => PrecomputedAuth::class,
        'gross'           => PrecomputedAuth::class,
        'gross_remaining' => PrecomputedAuth::class,
        'created_at'      => 'date',
        'updated_at'      => 'date',
        'paid_at'         => 'date',
        'due_at'          => 'date',
        'is_booked'       => 'boolean',
        'is_cancelled'    => 'boolean',
    ];
    protected $access = ['admin' => '*', 'project_manager' => '', 'developer' => ''];

    public function precomputeNetAttribute() {
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::Total)->sum('net');
    }
    public function precomputeGrossAttribute() {
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::Total)->sum('gross');
    }
    public function precomputeGrossRemainingAttribute() {
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::TotalRemaining)->sum('gross');
    }
    public function getIconAttribute() {
        return 'companies/'.$this->company_id.'/icon';
    }
    public function getPaymentDurationAttribute() {
        return $this->paid_at ? $this->paid_at->diffInDays($this->created_at) : null;
    }
    public function getReminderCountAttribute() {
        return $this->reminders()->count();
    }
    public function company() {
        return $this->belongsTo(Company::class);
    }
    public function cancelledBy() {
        return $this->hasOne(Invoice::class, 'cancellation_invoice_id');
    }
    public function cancelles() {
        return $this->hasOne(Invoice::class, 'id', 'cancellation_invoice_id');
    }
    public function reminders() {
        return $this->hasMany(InvoiceReminder::class);
    }
    public function indexedItems() {
        return $this->invoiceItems()->with('productSource')->oldest('position');
    }
    public function newEloquentBuilder($query) {
        return new InvoiceBuilder($query);
    }
    public static function format($value): string {
        return CurrencyFormatCast::format($value);
    }
    public static function getInvoiceBlade($items, $footers = [], $discounts = [], string $lang = 'de') {
        return view('InvoiceTable', ['items' => $items, 'footers' => $footers, 'discounts' => $discounts, 'lang' => $lang])->render();
    }
    public static function enhancedItemsForPdf($items, Company $company): array {
        return app(InvoiceItemEnhancementService::class)->enhanceItemsForPdf($items, $company);
    }
    public static function circledNumber(int $n): ?string {
        if ($n >= 1 && $n <= 20) {
            return mb_convert_encoding('&#'.(9311 + $n).';', 'UTF-8', 'HTML-ENTITIES');
        }
        return null;
    }
    public function setCancelledAttributes() {
        $this->is_cancelled = true;
        $this->paid_at      = now();
        $this->resetPrecomputedAttributes();
    }
    public function cancel() {
        [$zugferdPdf, $filename] = app(CancelInvoiceAction::class)->execute($this);
        return response($zugferdPdf)->withHeaders(File::headers($filename, 'application/pdf'));
    }
    public function sendMail() {
        $this->sent = 1;
        $this->save();
        SendInvoiceMailJob::dispatch($this);
        return $this;
    }
    public function sendReminder() {
        $this->sent = 1;

        // Calculate and set the next remind_at date immediately (before the job runs)
        $projectId       = $this->invoiceItems()->whereNotNull('project_id')->value('project_id');
        $paymentDuration = $projectId
            ? Project::find($projectId)?->param('INVOICE_PAYMENT_DURATION', true)->value
            : Param::get('INVOICE_PAYMENT_DURATION')->value;
        $this->remind_at = now()->addDays($paymentDuration);

        $this->save();
        SendInvoiceReminderJob::dispatch($this);

        // Reload the reminders relationship to get the newly created reminder
        $this->load('reminders');
        return $this;
    }
    public static function getCurrentInvoiceNumber($offset = 0) {
        $prefix  = Param::get('INVOICE_NO_PREFIX')->value;
        $suffix  = Param::get('INVOICE_NO_SUFFIX')->value;
        $number  = Param::get('INVOICE_NO_DIGITS')->value;
        $current = (string)(Param::get('INVOICE_NO_CURRENT'))->value + $offset;
        while (strlen($current) < $number) {
            $current = '0'.$current;
        }
        return ['value' => $prefix.$current.$suffix];
    }
    public static function getCurrentInvoiceNumberInt() {
        return Param::get('INVOICE_NO_CURRENT')->value;
    }
    public static function batchAssign($items, $invoice_id, $company_id) {
        $ss1 = new SmartSql('invoice_items', 'invoice_id');
        $ss2 = new SmartSql('invoice_items', 'company_id');
        foreach ($items as $i) {
            $ss1->add($i->id, $invoice_id);
            $ss2->add($i->id, $company_id);
        }
        $ss1->save();
        $ss2->save();
    }
    public static function getSepaQr($amount, $title) {
        $amount      = number_format($amount, 2, '.', '');
        $bic         = Param::get('ME_BIC')->value ?? '';
        $companyName = Param::get('ME_NAME')->value ?? '';
        $iban        = Param::get('ME_IBAN')->value ?? '';
        $qr          = '';
        $qr .= 'BCD'.PHP_EOL;
        $qr .= '002'.PHP_EOL;
        $qr .= '2'.PHP_EOL;
        $qr .= 'SCT'.PHP_EOL;
        $qr .= $bic.PHP_EOL;
        $qr .= $companyName.PHP_EOL;
        $qr .= $iban.PHP_EOL;
        $qr .= 'EUR'.$amount.PHP_EOL;
        $qr .= ''.PHP_EOL;
        $qr .= ''.PHP_EOL;
        $qr .= $title.PHP_EOL;
        $qr .= ''.PHP_EOL;
        return Document::getBase64QrCode($qr);
    }
    public static function MakeFileName($invoiceNumber) {
        return date('Y').'-'.$invoiceNumber.'.pdf';
    }
}
