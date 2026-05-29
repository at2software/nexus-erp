<?php

namespace App\Services\FinTs\Native;

use App\Services\FinTs\FinTsTransaction;

/**
 * Parses ISO 20022 CAMT.052 / CAMT.053 XML into FinTsTransaction objects.
 * Uses local-name() XPath queries so it works across all CAMT namespace versions.
 */
class CamtParser {
    /** @return FinTsTransaction[] */
    public static function parse(string $xml): array {
        if (empty($xml)) {
            return [];
        }

        $transactions = [];
        try {
            $dom = new \DOMDocument();
            if (! @$dom->loadXML($xml)) {
                return [];
            }

            $xpath = new \DOMXPath($dom);

            foreach ($xpath->query('//*[local-name()="Ntry"]') as $entry) {
                $tx = self::parseEntry($xpath, $entry);
                if ($tx !== null) {
                    $transactions[] = $tx;
                }
            }
        } catch (\Throwable) {
        }

        return $transactions;
    }

    private static function parseEntry(\DOMXPath $xpath, \DOMNode $entry): ?FinTsTransaction {
        $text = fn (string $name) => (string) $xpath->evaluate(
            'normalize-space(.//*[local-name()="' . $name . '"])',
            $entry
        );

        $cdtDbt = $text('CdtDbtInd');
        $amtStr = $text('Amt');
        if (! $cdtDbt || ! $amtStr) {
            return null;
        }

        $cd = strtoupper($cdtDbt) === 'CRDT'
            ? FinTsTransaction::CD_CREDIT
            : FinTsTransaction::CD_DEBIT;

        $amount  = (float) $amtStr;
        $storno  = $text('RvslInd') === 'true';
        $dateStr = $text('Dt'); // BookgDt/Dt appears before ValDt/Dt in document order

        $bookingDate = null;
        if ($dateStr) {
            try {
                $bookingDate = new \DateTime($dateStr);
            } catch (\Throwable) {
            }
        }

        // Purpose: concatenate all Ustrd elements
        $purpose = '';
        foreach ($xpath->query('.//*[local-name()="Ustrd"]', $entry) as $node) {
            $purpose .= $node->textContent;
        }
        $purpose = trim($purpose);

        // Counterparty name: Dbtr for incoming credits, Cdtr for outgoing debits
        $nmPath  = $cd === FinTsTransaction::CD_CREDIT
            ? './/*[local-name()="Dbtr"]/*[local-name()="Nm"]'
            : './/*[local-name()="Cdtr"]/*[local-name()="Nm"]';
        $nmNodes = $xpath->query($nmPath, $entry);
        $name    = ($nmNodes && $nmNodes->length > 0)
            ? trim($nmNodes->item(0)->textContent)
            : '';

        return new FinTsTransaction($cd, $amount, $name, $purpose, $bookingDate, $storno);
    }
}
