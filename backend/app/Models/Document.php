<?php

namespace App\Models;

use Barryvdh\DomPDF\Facade\Pdf;
use horstoeko\zugferd\codelists\ZugferdInvoiceType;
use horstoeko\zugferd\ZugferdDocumentBuilder;
use horstoeko\zugferd\ZugferdDocumentPdfMerger;
use horstoeko\zugferd\ZugferdProfiles;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use setasign\Fpdi\Fpdi;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class Document extends BaseModel {
    use HasFactory;

    protected $access = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    public static function getPdfTemplate($title = '', $omit = []) {
        $template = file_get_contents(public_path('pdf/template.html'));
        $template = str_replace('[documentTitle]', $title, $template);

        // Fill company identity from settings params
        $name     = Param::get('ME_NAME')->value ?? '';
        $email    = Param::get('ME_EMAIL')->value ?? '';
        $phone    = Param::get('ME_PHONE')->value ?? '';
        $fax      = Param::get('ME_FAX')->value ?? '';
        $iban     = Param::get('ME_IBAN')->value ?? '';
        $bic      = Param::get('ME_BIC')->value ?? '';
        $swift    = Param::get('ME_SWIFT')->value ?? '';
        $vatId    = Param::get('ME_VAT_ID')->value ?? '';
        $hregNo   = Param::get('ME_HREG_NO')->value ?? '';
        $hregName = Param::get('ME_HREG_NAME')->value ?? '';
        $owners   = Param::get('ME_COMPANY_OWNERS')->value ?? '';

        $me       = Company::find(Param::get('ME_ID')->value);
        $street   = $me?->vcard?->getFirstAttr('ADR', [])['STREET'] ?? '';
        $postcode = $me?->vcard?->getFirstAttr('ADR', [])['POSTALCODE'] ?? '';
        $city     = $me?->vcard?->getFirstAttr('ADR', [])['LOCALITY'] ?? '';
        $country  = $me?->vcard?->getFirstAttr('ADR', [])['COUNTRY'] ?? '';

        $senderLine = implode(' | ', array_filter([$name, "$street", "$postcode $city", $country]));
        $template   = str_replace('[senderAddress]', $senderLine, $template);
        $template   = str_replace('[city]', $city, $template);

        $companyHeader = '<table><tr>';
        $companyHeader .= '<td>Contact:<br />Web: '.($me?->vcard?->getFirstValue('URL') ?? '').'<br />Mail: '.$email.'<br />Fon: '.$phone.'<br />Fax: '.$fax.'<br /></td>';
        $companyHeader .= '<td>'.($hregNo ? 'Reg-No: '.$hregNo.'<br />'.$hregName.'<br />' : '').'Company owners: '.$owners.'<br />VAT-ID: '.$vatId.'</td>';
        $companyHeader .= '<td>IBAN: '.$iban.'<br />SWIFT: '.$swift.'<br />BIC: '.$bic.'</td>';
        $companyHeader .= '</tr></table>';
        $template = str_replace('[companyHeader]', $companyHeader, $template);

        if (! empty($omit)) {
            $dom = new \DOMDocument;
            libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="utf-8" ?>'.$template, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
            libxml_clear_errors();

            $xpath = new \DOMXPath($dom);

            foreach ($omit as $className) {
                $nodes = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' {$className} ')]");
                foreach ($nodes as $node) {
                    $node->parentNode->removeChild($node);
                }
            }

            $template = $dom->saveHTML();
        }
        return $template;
    }
    public static function pdfBlockRow($key, $value) {
        return '<div style="display:block; width:100%; margin:0; padding:0;"><div style="float:right;display:inline-block;">'.$value.'</div><div style="display:inline-block; font-weight: bold;">'.$key.'</div></div>';
    }
    public static function personalized($template, CompanyContact|Company|null $contact, $headers = [], $withContactInfo = true, ?Project $project = null) {
        $company      = $contact instanceof Company ? $contact : ($contact?->company ?? null);
        $lang         = $company?->getLanguage() ?? 'de';
        $replacements = self::personalizationArray($contact, $project);
        foreach ($replacements as $k => $v) {
            if (is_string($v)) {
                $template = str_replace("[$k]", $v, $template);
            }
        }
        if (($user = request()->user()) && $withContactInfo) {
            $fn        = $user->vcard->getFirstValue('FN', '');
            $tel       = $user->vcard->getFirstValue('TEL', '');
            $email     = $user->vcard->getFirstValue('EMAIL', '');
            $headers[] = self::pdfBlockRow(__('pdf.contact_person', [], $lang).' ', $fn).
                         self::pdfBlockRow(__('pdf.phone', [], $lang), $tel).
                         self::pdfBlockRow(__('pdf.email', [], $lang).' ', $email);
        }
        if ($contact) {
            $headers[] = self::pdfBlockRow(__('pdf.customer_number', [], $lang), $company->customer_number);
        }
        $template = str_replace('[headerInfo]', implode('<br>', $headers), $template);
        $template = str_replace('[pageLabel]', __('pdf.page', [], $lang), $template);
        return $template;
    }
    public static function replaceInvoiceInformation($template, Invoice $invoice) {
        $template = str_replace('[invoice_name]', str_replace('Rechnung ', '', $invoice->name), $template);
        $template = str_replace('[invoice_date]', $invoice->created_at->format('d.m.Y'), $template);
        return $template;
    }
    private static function getPaymentDuration(?Project $project, CompanyContact|Company|null $contact): string {
        // Cascade: project -> customer -> global default
        // Do NOT pass fallback=true here — that would return the global default
        // for entities without a custom value, making the condition truthy and
        // short-circuiting the cascade before reaching the company check.
        if ($project && $projectDuration = $project->param('INVOICE_PAYMENT_DURATION')->value) {
            return $projectDuration;
        }
        if ($contact && $customerDuration = $contact->param('INVOICE_PAYMENT_DURATION')->value) {
            return $customerDuration;
        }
        return Param::get('INVOICE_PAYMENT_DURATION')->value ?? '14';
    }
    public static function personalizationArray(CompanyContact|Company|null $contact = null, ?Project $project = null) {
        $replaces = [];
        // general - payment duration with cascading logic: project -> customer -> global default
        $INVOICE_PAYMENT_DURATION     = self::getPaymentDuration($project, $contact);
        $replaces['dayNow']           = date('d.m.Y');
        $replaces['day+due']          = date('d.m.Y', strtotime('+'.$INVOICE_PAYMENT_DURATION.' days'));
        $replaces['payment-duration'] = $INVOICE_PAYMENT_DURATION;

        if ($contact) {
            if ($contact instanceof CompanyContact) {
                $replaces['r']              = $contact->is_male() ? 'r' : '';
                $replaces['companyName']    = ''.$contact->company->name;
                $replaces['customerNumber'] = ''.$contact->company->customer_number;
                $replaces['address']        = implode('<br>', self::getDin5008Address($contact));
                $replaces['address_array']  = $contact->vcard->getFirstAttr('ADR', []);
                $replaces                   = array_merge($replaces, $contact->salutationReplacements());
            } else {
                $replaces['customerNumber'] = ''.$contact->customer_number;
                $replaces['companyName']    = ''.$contact->name;
                $replaces['address']        = implode('<br>', self::getDin5008Address($contact));
                $replaces['address_array']  = $contact->vcard->getFirstAttr('ADR', []);
            }
        }
        return $replaces;
    }
    public static function renderPdf(string $template): string {
        return Pdf::loadHTML($template)->output();
    }
    public static function getBase64QrCode($text) {
        return 'data:image/png;base64, '.base64_encode(QrCode::size(500)->format('png')->generate($text));
    }
    public static function getDin5008Address($_, $prepend = true) {
        if (! ($_ instanceof Company) && ! ($_ instanceof CompanyContact)) {
            return '';
        }
        $company = $_ instanceof Company ? $_ : $_->company;
        $contact = $_ instanceof CompanyContact ? $_ : null;
        $adr     = $company->vcard->getFirstAttr('ADR');
        if ($adr) {
            $lines = array_filter(self::getAddressFormat($adr, $company, $contact), fn ($_) => $_ != null);
            while ($prepend && count($lines) < 8) {
                array_unshift($lines, '');
            }
            return $lines;
        }
        return [];
    }
    private static function getAddressFormat($ADR, ?Company $company = null, ?CompanyContact $contact = null) {
        $_  = $ADR;
        $cs = fn () => $contact?->salutationReplacements()['fullSalutation'];
        $cn = fn () => $company?->vcard->getFirstValue('ORG');
        if (count($_) < 7) {
            return '';
        }
        // https://datatracker.ietf.org/doc/html/rfc6350#section-6.3.1
        //   0 the post office box;
        //   1 the extended address (e.g., apartment or suite number);
        //   2 the street address;
        //   3 the locality (e.g., city);
        //   4 the region (e.g., state or province);
        //   5 the postal code;
        //   6 the country name
        switch (strtoupper($_[6])) {
            case 'SG': return [$cn(), $cs(), $_[0], $_[2], $_[1], $_[3].' '.$_[5], 'SINGAPUR']; // https://www.lingonomad.com/blogs/singapore/address-format            case 'DE': return [$cn(), $cs(), $_[0], $_[2], $_[1], $_[5].' '.$_[3]];
            case 'US': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[3].', '.$_[4].' '.$_[5], 'USA'];
            case 'FR': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'FRANKREICH'];
            case 'IT': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3].' ('.$_[4].')', 'ITALIEN'];
            case 'ES': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3].' ('.$_[4].')', 'SPANIEN'];
            case 'NL': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'NIEDERLANDE'];
            case 'BE': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'BELGIEN'];
            case 'AT': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'ÖSTERREICH'];
            case 'CH': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'SCHWEIZ'];
            case 'SE': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'SCHWEDEN'];
            case 'DK': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'DÄNEMARK'];
            case 'NO': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'NORWEGEN'];
            case 'FI': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'FINNLAND'];
            case 'PL': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'POLEN'];
            case 'CZ': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'TSCHECHIEN'];
            case 'HU': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[5].' '.$_[3], 'UNGARN'];
            case 'GB': return [$cn(), $cs(), $_[0], $_[1], $_[2], $_[3], $_[5], 'GROSSBRITANNIEN'];
            default:
                $countryCodes = config('country-codes');
                $country      = strtoupper($countryCodes[$_[6]] ?? '--'.$_[6].'--');
                return [$cn(), $cs(), $_[0], $_[2], $_[1], $_[5].' '.$_[3], $country];
        }
        return [];
    }

    /**
     * @param $_ string[] address array in RFC6350 order
     * @return string[] address array in FacturX order
     */
    public static function rfc6350toFacturX(array $_): array {
        return [$_[2], $_[1], $_[0], $_[5], $_[3], $_[6], $_[4]];
    }

    public static function makeZUGFeRD($pdf, $items, $company, $id = 0, string $documentTypeCode = ZugferdInvoiceType::INVOICE, $footer = [], ?Project $project = null) {
        // Use direct method call since Laravel accessor isn't working
        $params = $company->getParamsAttribute();

        $p = Document::personalizationArray($company);

        // Determine invoice type for VAT handling
        $isReverseCharge  = $company->needs_vat_handling && ! empty($company->vat_id) && trim($company->vat_id) !== '';
        $isEuWithoutVatId = $company->needs_vat_handling && (empty($company->vat_id) || trim($company->vat_id) === '');

        $document = ZugferdDocumentBuilder::CreateNew(ZugferdProfiles::PROFILE_XRECHNUNG_3);

        // Document Information

        // PEPPOL-EN16931-R010: Buyer email is required (initialize before seller block)
        $buyerEmail = trim($company->vcard?->getFirstValue('EMAIL') ?? '');
        if (empty($buyerEmail)) {
            $buyerEmail = 'customer@example.com';
        }

        // Initialize seller vars before conditional block (used later outside it)
        $me   = null;
        $iban = '';

        // Seller Information
        if ($me = Company::find(Param::get('ME_ID')->value)) {
            $iban = Param::get('ME_IBAN')->value;
            // PEPPOL-EN16931-R020: Seller email is required
            $sellerEmail = Param::get('ME_EMAIL')->value ?? '';
            if (empty($sellerEmail) || trim($sellerEmail) === '') {
                $sellerEmail = env('MAIL_FROM_ADDRESS', 'noreply@example.com');
            }

            $document
                // https://portal3.gefeg.com/projectdata/invoice/deliverables/installed/publishingproject/zugferd%202.1%20-%20facturx%201.0.05/en%2016931%20%E2%80%93%20facturx%201.0.05%20%E2%80%93%20zugferd%202.1%20-%20basic.scm/html/de/021.htm?https://portal3.gefeg.com/projectdata/invoice/deliverables/installed/publishingproject/zugferd%202.1%20-%20facturx%201.0.05/en%2016931%20%E2%80%93%20facturx%201.0.05%20%E2%80%93%20zugferd%202.1%20-%20basic.scm/html/de/0213.htm
                ->setDocumentInformation($id, $documentTypeCode, new \DateTime, 'EUR')
                ->setDocumentSupplyChainEvent(new \DateTime);

            $adr = self::rfc6350toFacturX($me->vcard->getFirstAttr('ADR'));
            $document
                ->setDocumentSeller('at² GmbH', Param::get('ME_TAX_ID')->value)
                ->addDocumentSellerGlobalId(Param::get('ME_SWIFT')->value, '0021')    // 0021 : SWIFT, 0088 : EAN, 0060 : DUNS, 0177 : ODETTE
                ->addDocumentSellerTaxRegistration('FC', Param::get('ME_TAX_ID')->value);

            // BR-O-02: Don't add seller VAT identifier for reverse charge invoices
            if (! $isReverseCharge) {
                $document->addDocumentSellerTaxRegistration('VA', Param::get('ME_VAT_ID')->value);
            }

            $document
                ->setDocumentSellerAddress(...$adr)
                ->setDocumentSellerContact(
                    Param::get('ME_COMPANY_OWNERS')->value,
                    Param::get('ME_DEPARTMENT')->value,
                    Param::get('ME_PHONE')->value,
                    Param::get('ME_FAX')->value,
                    $sellerEmail);
        }

        // Set Buyer Information
        $adr = self::rfc6350toFacturX($p['address_array']);
        $document
            ->setDocumentBuyer($p['companyName'], $p['customerNumber'])
            ->setDocumentBuyerReference($p['customerNumber'])
            ->setDocumentBuyerAddress(...$adr)
            ->setDocumentBuyerContact('', '', '', '', $buyerEmail); // Required by PEPPOL

        // BR-O-02: Add buyer VAT identifier only for reverse charge invoices
        if ($isReverseCharge) {
            $document->addDocumentBuyerTaxRegistration('VA', $company->vat_id);
        }

        $unitCodeMap = config('invoice.unit_codes');

        // Add Items
        foreach ($items as $k => $item) {
            // Convert unit to UN/ECE standard
            $unitCode = $unitCodeMap[$item['unit_name']] ?? 'C62'; // Default to piece

            // PEPPOL-R046: Net price = Gross price - Discount
            $grossPrice      = floatval($item['price']);
            $discountedPrice = floatval($item['price_discounted']);
            // If there's a discount, show the relationship properly
            if ($grossPrice > $discountedPrice) {
                $netPrice = $discountedPrice; // Net = Gross - Discount
            } else {
                $netPrice = $grossPrice; // No discount case
            }

            // Determine VAT category based on company location and VAT ID
            $vatRate     = floatval($item['vat_rate']);
            $vatCategory = 'S'; // Default: Standard rate

            if (! $company->needs_vat_handling) {
                // Non-EU: Tax-free export
                $vatCategory = 'G'; // Export outside EU
                $vatRate     = 0.0; // Always 0% for exports
            } elseif ($isReverseCharge) {
                // EU with valid VAT ID: Reverse charge (0% VAT)
                $vatCategory = 'O'; // Not subject to VAT (reverse charge)
                $vatRate     = 0.0; // 0% for reverse charge
            }
            // EU without VAT ID: Use regular German VAT rates (keep original vatRate and category 'S')
            // This should be treated exactly like a German invoice

            $document->addNewPosition($k)
                ->setDocumentPositionProductDetails(strip_tags($item['text']), '', $item['product_id'], null, '0160', '4012345001235')
                ->setDocumentPositionGrossPrice($grossPrice)
                ->setDocumentPositionNetPrice($netPrice)
                ->setDocumentPositionQuantity($item['qty'], $unitCode);

            // Add position tax based on category
            if ($vatCategory === 'O') {
                // BR-O-05: VAT rate shall NOT be provided for category 'O' positions
                // BR-O-02: Use exemption reason for "Not subject to VAT"
                $document->addDocumentPositionTax($vatCategory, 'VAT', null, null, 'Steuerfrei nach §4 Nummer 1b in Verbindung mit §6a UStG');
            } elseif ($vatCategory === 'G') {
                // Export outside EU
                $document->addDocumentPositionTax($vatCategory, 'VAT', $vatRate, null, 'Steuerfreie Ausfuhrlieferung gemäß §4 Nr. 1a UStG i.V.m. §6 UStG');
            } else {
                // Standard VAT rate
                $document->addDocumentPositionTax($vatCategory, 'VAT', $vatRate);
            }

            $document->setDocumentPositionLineSummation(floatval($item['net']));
        }

        $totalGross = $items->sum('gross');
        $totalNet   = $items->sum('net');
        $totalVat   = $items->sum('vat');

        // VAT breakdown (BG-23) - Required by BR-CO-18 and BR-S-01
        $calculatedVatTotal = 0;

        if (! $company->needs_vat_handling) {
            // Non-EU: Create single tax-free export entry with exemption reason
            $document->addDocumentTax(
                'G', // Export outside EU
                'VAT',
                $totalNet, // Taxable amount
                0.0, // Tax amount (always 0 for exports)
                0.0, // Tax rate (always 0% for exports)
                'Steuerfreie Ausfuhrlieferung gemäß §4 Nr. 1a UStG i.V.m. §6 UStG', // German tax law reference
                null // BT-121: VAT exemption reason code (using text instead)
            );
            $calculatedVatTotal = 0.0;
        } elseif ($isReverseCharge) {
            // EU with valid VAT ID: Reverse charge (0% VAT)
            $document->addDocumentTax(
                'O', // Not subject to VAT (reverse charge)
                'VAT',
                $totalNet, // Taxable amount
                0.0, // Tax amount (0 for reverse charge)
                0.0, // BR-DE-14: VAT category rate must be provided
                'Steuerfrei nach §4 Nummer 1b in Verbindung mit §6a UStG' // German reverse charge law
            );
            $calculatedVatTotal = 0.0;
        } elseif ($isEuWithoutVatId) {
            // EU without VAT ID: Calculate VAT breakdown from line items (like German invoices)
            $vatBreakdown = [];

            // Group line items by VAT rate to create proper breakdown
            foreach ($items as $item) {
                $itemVatRate = floatval($item['vat_rate']);
                $itemNet     = floatval($item['net']);
                $itemVat     = floatval($item['vat']);

                $rateKey = (string)$itemVatRate;
                if (! isset($vatBreakdown[$rateKey])) {
                    $vatBreakdown[$rateKey] = [
                        'rate'           => $itemVatRate,
                        'taxable_amount' => 0.0,
                        'tax_amount'     => 0.0,
                        'category'       => 'S', // Standard rate for EU without VAT ID
                    ];
                }

                $vatBreakdown[$rateKey]['taxable_amount'] += $itemNet;
                $vatBreakdown[$rateKey]['tax_amount'] += $itemVat;
            }

            // Add VAT breakdown entries
            foreach ($vatBreakdown as $breakdown) {
                $calculatedVatTotal += $breakdown['tax_amount'];
                $document->addDocumentTax(
                    $breakdown['category'],
                    'VAT',
                    $breakdown['taxable_amount'],
                    $breakdown['tax_amount'],
                    $breakdown['rate']
                );
            }
        } else {
            // German customers: Use footer breakdown (original logic)
            foreach ($footer as $footerItem) {
                // Footer structure: [$description, $formattedAmount, $symbol, $vatData]
                if (is_array($footerItem) && count($footerItem) >= 4 && $footerItem[3] !== null) {
                    $vatData = $footerItem[3];
                    $calculatedVatTotal += $vatData['tax_amount'];

                    $document->addDocumentTax(
                        $vatData['category'],
                        'VAT',
                        $vatData['taxable_amount'],
                        $vatData['tax_amount'],
                        $vatData['rate']
                    );
                }
            }
        }
        $paymentDurationParam = $company->param('INVOICE_PAYMENT_DURATION', true);
        $paymentDuration      = $paymentDurationParam->value;

        $due_date = now()->addDays($paymentDuration);

        // Payment methods - Only use direct debit if customer has valid mandate and IBAN
        $hasDirectDebitMandate = ! empty($params['INVOICE_DD_MANDATE']) &&
                                ! empty($params['INVOICE_DD_IBAN']) &&
                                trim($params['INVOICE_DD_MANDATE']) !== '' &&
                                trim($params['INVOICE_DD_IBAN']) !== '';

        if ($hasDirectDebitMandate) {
            // SEPA Direct Debit - Customer has valid mandate
            // BR-DE-29, BR-DE-30, BR-DE-31 are required for BG-19 (DIRECT DEBIT)
            $mandateId      = trim($params['INVOICE_DD_MANDATE']); // BR-DE-29: Mandate reference identifier
            $creditorId     = Param::get('ME_CREDITOR_ID')->value ?? null; // BR-DE-30: Bank assigned creditor identifier
            $debitedAccount = trim($params['INVOICE_DD_IBAN']); // BR-DE-31: Debited account identifier

            // Ensure creditor ID exists for validation
            if (empty($creditorId) || trim($creditorId) === '') {
                $creditorId = 'DE00ZZZ00000000000'; // Fallback creditor ID
            }

            // Create BG-19 (DIRECT DEBIT) group - payment means first, then terms
            $document->addDocumentPaymentMeanToDirectDebit($debitedAccount, $creditorId);
        } else {
            // Credit Transfer - Customer has no direct debit mandate
            // BR-DE-23-a: Must provide BG-17 (CREDIT TRANSFER)
            // BR-DE-23-b: Must NOT have BG-18 or BG-19 (no card payment, no direct debit)
            $document->addDocumentPaymentMeanToCreditTransferNonSepa(
                $iban, // Payment account identifier - BR-DE-19
                $me->name,
                substr($iban, 0, 4),
                Param::get('ME_BIC')->value,
                (string)$id // Payment reference
            );
        }

        // Add payment terms after payment means to fix XML ordering
        if ($hasDirectDebitMandate) {
            $mandateId = trim($params['INVOICE_DD_MANDATE']);
            $document->addDocumentPaymentTerm(null, $due_date->toDateTime(), $mandateId);
        } else {
            $document->addDocumentPaymentTerm(null, $due_date->toDateTime());
        }

        /* po_number */
        if ($project && $project->po_number) {
            $document->setDocumentProcuringProject($project->po_number, $project->name);
        }

        // Document summation - ensure VAT amount matches breakdown (BR-CO-14)
        $document->setDocumentSummation($totalGross, $totalGross, $totalNet, 0.0, 0.0, $totalNet, $calculatedVatTotal, null, 0.0);
        return (new ZugferdDocumentPdfMerger($document->getContent(), $pdf))->generateDocument()->downloadString('');
    }
    public static function mergePdfs($relativePath, $uploadedFiles) {
        $finalPdf    = new Fpdi;
        $mainPdfPath = storage_path('app/'.$relativePath);

        self::importPdfIntoFpdi($finalPdf, $mainPdfPath);

        $changed = false;
        foreach ($uploadedFiles as $file) {
            $mime         = $file->getMimeType();
            $path         = $file->getPathname();
            $originalName = $file->getClientOriginalName();

            if (str_starts_with($mime, 'image/')) {
                $changed          = true;
                [$width, $height] = getimagesize($path);
                $widthMM          = $width * 0.264583;
                $heightMM         = $height * 0.264583;

                $finalPdf->AddPage('P', [$widthMM, $heightMM]);
                $imageExtension = pathinfo($originalName, PATHINFO_EXTENSION);
                $imageType      = strtolower($imageExtension);
                $finalPdf->Image($path, 0, 0, $widthMM, $heightMM, strtoupper($imageType));
            } elseif ($mime === 'application/pdf') {
                $changed = true;
                self::importPdfIntoFpdi($finalPdf, $path);
            }
        }
        $mergedPath = storage_path('app/'.$relativePath);
        $finalPdf->Output($mergedPath, 'F');
        return $changed;
    }
    private static function importPdfIntoFpdi(Fpdi $pdf, string $path): void {
        $pageCount = $pdf->setSourceFile($path);
        for ($i = 1; $i <= $pageCount; $i++) {
            $tplIdx = $pdf->importPage($i);
            $size   = $pdf->getTemplateSize($tplIdx);

            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($tplIdx);
        }
    }
}
