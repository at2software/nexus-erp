<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Document;
use App\Models\Param;
use App\Models\Project;
use horstoeko\zugferd\codelists\ZugferdInvoiceType;
use horstoeko\zugferd\ZugferdDocumentBuilder;
use horstoeko\zugferd\ZugferdDocumentPdfMerger;
use horstoeko\zugferd\ZugferdProfiles;

class ZugferdInvoiceBuilder {
    public static function build($pdf, $items, Company $company, $id = 0, string $documentTypeCode = ZugferdInvoiceType::INVOICE, $footer = [], ?Project $project = null): string {
        $params = $company->getParamsAttribute();
        $p      = Document::personalizationArray($company);

        $isReverseCharge  = $company->needs_vat_handling && ! empty($company->vat_id) && trim($company->vat_id) !== '';
        $isEuWithoutVatId = $company->needs_vat_handling && (empty($company->vat_id) || trim($company->vat_id) === '');

        $document = ZugferdDocumentBuilder::CreateNew(ZugferdProfiles::PROFILE_XRECHNUNG_3);

        $buyerEmail = trim($company->vcard?->getFirstValue('EMAIL') ?? '');
        if (empty($buyerEmail)) {
            $buyerEmail = 'customer@example.com';
        }

        $me   = null;
        $iban = '';

        if ($me = Company::find(Param::get('ME_ID')->value)) {
            $iban        = Param::get('ME_IBAN')->value;
            $sellerEmail = Param::get('ME_EMAIL')->value ?? '';
            if (empty($sellerEmail) || trim($sellerEmail) === '') {
                $sellerEmail = config('mail.from.address', 'noreply@example.com');
            }

            $document
                ->setDocumentInformation($id, $documentTypeCode, new \DateTime, 'EUR')
                ->setDocumentSupplyChainEvent(new \DateTime);

            $adr = Document::rfc6350toFacturX($me->vcard->getFirstAttr('ADR'));
            $document
                ->setDocumentSeller('at² GmbH', Param::get('ME_TAX_ID')->value)
                ->addDocumentSellerGlobalId(Param::get('ME_SWIFT')->value, '0021')
                ->addDocumentSellerTaxRegistration('FC', Param::get('ME_TAX_ID')->value);

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

        $adr = Document::rfc6350toFacturX($p['address_array']);
        $document
            ->setDocumentBuyer($p['companyName'], $p['customerNumber'])
            ->setDocumentBuyerReference($p['customerNumber'])
            ->setDocumentBuyerAddress(...$adr)
            ->setDocumentBuyerContact('', '', '', '', $buyerEmail);

        if ($isReverseCharge) {
            $document->addDocumentBuyerTaxRegistration('VA', $company->vat_id);
        }

        $unitCodeMap = config('invoice.unit_codes');

        foreach ($items as $k => $item) {
            $unitCode        = $unitCodeMap[$item['unit_name']] ?? 'C62';
            $grossPrice      = floatval($item['price']);
            $discountedPrice = floatval($item['price_discounted']);

            $netPrice = $grossPrice > $discountedPrice ? $discountedPrice : $grossPrice;

            $vatRate     = floatval($item['vat_rate']);
            $vatCategory = 'S';

            if (! $company->needs_vat_handling) {
                $vatCategory = 'G';
                $vatRate     = 0.0;
            } elseif ($isReverseCharge) {
                $vatCategory = 'O';
                $vatRate     = 0.0;
            }

            $document->addNewPosition($k)
                ->setDocumentPositionProductDetails(strip_tags($item['text']), '', $item['product_id'], null, '0160', '4012345001235')
                ->setDocumentPositionGrossPrice($grossPrice)
                ->setDocumentPositionNetPrice($netPrice)
                ->setDocumentPositionQuantity($item['qty'], $unitCode);

            if ($vatCategory === 'O') {
                $document->addDocumentPositionTax($vatCategory, 'VAT', null, null, 'Steuerfrei nach §4 Nummer 1b in Verbindung mit §6a UStG');
            } elseif ($vatCategory === 'G') {
                $document->addDocumentPositionTax($vatCategory, 'VAT', $vatRate, null, 'Steuerfreie Ausfuhrlieferung gemäß §4 Nr. 1a UStG i.V.m. §6 UStG');
            } else {
                $document->addDocumentPositionTax($vatCategory, 'VAT', $vatRate);
            }

            $document->setDocumentPositionLineSummation(floatval($item['net']));
        }

        $totalGross = $items->sum('gross');
        $totalNet   = $items->sum('net');
        $totalVat   = $items->sum('vat');

        $calculatedVatTotal = 0;

        if (! $company->needs_vat_handling) {
            $document->addDocumentTax('G', 'VAT', $totalNet, 0.0, 0.0,
                'Steuerfreie Ausfuhrlieferung gemäß §4 Nr. 1a UStG i.V.m. §6 UStG', null);
            $calculatedVatTotal = 0.0;
        } elseif ($isReverseCharge) {
            $document->addDocumentTax('O', 'VAT', $totalNet, 0.0, 0.0,
                'Steuerfrei nach §4 Nummer 1b in Verbindung mit §6a UStG');
            $calculatedVatTotal = 0.0;
        } elseif ($isEuWithoutVatId) {
            $vatBreakdown = [];
            foreach ($items as $item) {
                $rateKey = (string)floatval($item['vat_rate']);
                if (! isset($vatBreakdown[$rateKey])) {
                    $vatBreakdown[$rateKey] = ['rate' => floatval($item['vat_rate']), 'taxable_amount' => 0.0, 'tax_amount' => 0.0, 'category' => 'S'];
                }
                $vatBreakdown[$rateKey]['taxable_amount'] += floatval($item['net']);
                $vatBreakdown[$rateKey]['tax_amount'] += floatval($item['vat']);
            }
            foreach ($vatBreakdown as $breakdown) {
                $calculatedVatTotal += $breakdown['tax_amount'];
                $document->addDocumentTax($breakdown['category'], 'VAT', $breakdown['taxable_amount'], $breakdown['tax_amount'], $breakdown['rate']);
            }
        } else {
            foreach ($footer as $footerItem) {
                if (is_array($footerItem) && count($footerItem) >= 4 && $footerItem[3] !== null) {
                    $vatData = $footerItem[3];
                    $calculatedVatTotal += $vatData['tax_amount'];
                    $document->addDocumentTax($vatData['category'], 'VAT', $vatData['taxable_amount'], $vatData['tax_amount'], $vatData['rate']);
                }
            }
        }

        $paymentDurationParam = $company->param('INVOICE_PAYMENT_DURATION', true);
        $paymentDuration      = $paymentDurationParam->value;
        $due_date             = now()->addDays($paymentDuration);

        $hasDirectDebitMandate = ! empty($params['INVOICE_DD_MANDATE']) &&
                                ! empty($params['INVOICE_DD_IBAN']) &&
                                trim($params['INVOICE_DD_MANDATE']) !== '' &&
                                trim($params['INVOICE_DD_IBAN']) !== '';

        if ($hasDirectDebitMandate) {
            $debitedAccount = trim($params['INVOICE_DD_IBAN']);
            $creditorId     = Param::get('ME_CREDITOR_ID')->value ?? null;
            if (empty($creditorId) || trim($creditorId) === '') {
                $creditorId = 'DE00ZZZ00000000000';
            }
            $document->addDocumentPaymentMeanToDirectDebit($debitedAccount, $creditorId);
        } else {
            $document->addDocumentPaymentMeanToCreditTransferNonSepa(
                $iban, $me->name, substr($iban, 0, 4),
                Param::get('ME_BIC')->value, (string)$id
            );
        }

        if ($hasDirectDebitMandate) {
            $mandateId = trim($params['INVOICE_DD_MANDATE']);
            $document->addDocumentPaymentTerm(null, $due_date->toDateTime(), $mandateId);
        } else {
            $document->addDocumentPaymentTerm(null, $due_date->toDateTime());
        }

        if ($project && $project->po_number) {
            $document->setDocumentProcuringProject($project->po_number, $project->name);
        }

        $document->setDocumentSummation($totalGross, $totalGross, $totalNet, 0.0, 0.0, $totalNet, $calculatedVatTotal, null, 0.0);

        return (new ZugferdDocumentPdfMerger($document->getContent(), $pdf))->generateDocument()->downloadString('');
    }
}
