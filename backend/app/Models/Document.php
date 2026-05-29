<?php

namespace App\Models;

use App\Services\ZugferdInvoiceBuilder;
use Barryvdh\DomPDF\Facade\Pdf;
use horstoeko\zugferd\codelists\ZugferdInvoiceType;
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
        // Cascade: project -> customer company -> global default
        // Payment duration is stored on Company, not CompanyContact — always resolve to Company.
        if ($project && $projectDuration = $project->param('INVOICE_PAYMENT_DURATION')->value) {
            return $projectDuration;
        }
        $company = $project?->company;
        if ($company && $customerDuration = $company->param('INVOICE_PAYMENT_DURATION')->value) {
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
        return ZugferdInvoiceBuilder::build($pdf, $items, $company, $id, $documentTypeCode, $footer, $project);
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
