<?php

namespace App\Services\FinTs;

use App\Services\FinTs\Native\CamtParser;
use App\Services\FinTs\Native\HbciConnection;
use App\Services\FinTs\Native\HbciMessage;
use App\Services\FinTs\Native\HbciSegment;
use App\Services\FinTs\Native\Mt940Parser;

/**
 * Minimal FinTS 3.0 PIN/TAN client using NoPsd2 (TAN method 999).
 *
 * Only supports: fetchBalance() and fetchTransactionsSince().
 * Does NOT support TAN challenges, PSD2 SCA, or non-Deutsche Bank endpoints.
 *
 * Dialog flow per operation:
 *   1. Anonymous sync  → get systemId (HKIDN/HKVVB/HKSYN)
 *   2. Authenticated dialog init → get dialogId (HKIDN/HKVVB, wrapped with PIN)
 *   3. Authenticated data request → HKSAL or HKCAZ/HKKAZ
 *   4. Authenticated HKEND
 */
class NativeFinTsDriver implements FinTsDriverInterface {
    private HbciConnection $conn;
    private string $blz;
    private string $iban;
    private string $username;
    private string $pin;

    public function __construct(private array $credentials) {
        $url            = $this->cred('URL');
        $this->blz      = $this->cred('BLZ');
        $this->iban     = $this->cred('IBAN');
        $this->username = $this->cred('USERNAME');
        $this->pin      = $this->cred('PIN');
        $this->conn     = new HbciConnection($url, $this->resolveBundle());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Public interface
    // ──────────────────────────────────────────────────────────────────────────

    public function fetchBalance(): ?float {
        $systemId = $this->getSystemId();
        $dialogId = $this->openDialog($systemId);
        $msgno    = 2;

        $ibanKti = HbciSegment::escape($this->iban) . ':::::';

        // Attempt 1: HKSAL v6 with IBAN-only Kti (BPD: HISALS v6, sec-class 0)
        $msg  = HbciMessage::buildWrapped($dialogId, $msgno++, $systemId, $this->blz, $this->username, $this->pin, ["HKSAL:3:6+{$ibanKti}+N'"]);
        $resp = $this->conn->send($msg);
        $segs = HbciMessage::parseAll($resp);

        if (HbciMessage::hasError($segs)) {
            // Attempt 2: HKSAL v5 with national Kto DEG (BPD: HISALS v5)
            $kontonummer = strlen($this->iban) === 22 ? ltrim(substr($this->iban, 12, 10), '0') : '';
            $ktoNational = implode(':', array_map([HbciSegment::class, 'escape'], [$kontonummer, '', '280', $this->blz]));
            $msg  = HbciMessage::buildWrapped($dialogId, $msgno++, $systemId, $this->blz, $this->username, $this->pin, ["HKSAL:3:5+{$ktoNational}+N'"]);
            $resp = $this->conn->send($msg);
            $segs = HbciMessage::parseAll($resp);
        }

        $this->endDialog($dialogId, $systemId, $msgno);

        if (HbciMessage::hasError($segs)) {
            $this->throwFirstError($segs, 'balance fetch');
        }
        return $this->extractBalance($segs);
    }

    public function fetchTransactionsSince(\DateTime $since): array {
        $acctStr = $this->acctStr();
        $from    = $since->format('Ymd');
        $to      = (new \DateTime())->format('Ymd');

        $systemId = $this->getSystemId();
        $dialogId = $this->openDialog($systemId);
        $msgno    = 2;

        // IBAN-only Kti DEG (no legacy Kontonummer/BLZ sub-fields) for HKCAZ and HKKAZ v6.
        // Deutsche Bank's v6 implementation returns 9150 "Inhalt zu lang" when the full Kti
        // DEG (IBAN + account# + BLZ) is sent — IBAN-only avoids that.
        $ibanKti = HbciSegment::escape($this->iban) . ':::::';

        // Attempt 1: HKCAZ (CAMT.052.001.08 — only URN advertised in HICAZS BPD)
        $c052  = HbciSegment::escape('urn:iso:std:iso:20022:tech:xsd:camt.052.001.08');
        $hkcaz = "HKCAZ:3:1+{$ibanKti}+N+{$from}+{$to}+++{$c052}'";
        $msg   = HbciMessage::buildWrapped($dialogId, $msgno++, $systemId, $this->blz, $this->username, $this->pin, [$hkcaz]);
        $resp  = $this->conn->send($msg);
        $segs  = HbciMessage::parseAll($resp);

        if (HbciMessage::hasError($segs)) {
            // Attempt 2: HKKAZ v6 with IBAN-only Kti DEG (BPD: HIKAZS v6, sec-class 0)
            $hkkaz6 = "HKKAZ:3:6+{$ibanKti}+N+{$from}+{$to}'";
            $msg    = HbciMessage::buildWrapped($dialogId, $msgno++, $systemId, $this->blz, $this->username, $this->pin, [$hkkaz6]);
            $resp   = $this->conn->send($msg);
            $segs   = HbciMessage::parseAll($resp);
        }

        if (HbciMessage::hasError($segs)) {
            // Attempt 3: HKKAZ v5 with national Kto DEG (BPD: HIKAZS v5)
            // v5 uses the old 4-field format: kontonummer::kik-land:kik-blz
            $kontonummer = strlen($this->iban) === 22 ? ltrim(substr($this->iban, 12, 10), '0') : '';
            $ktoNational = implode(':', array_map([HbciSegment::class, 'escape'], [$kontonummer, '', '280', $this->blz]));
            $hkkaz5 = "HKKAZ:3:5+{$ktoNational}+N+{$from}+{$to}'";
            $msg    = HbciMessage::buildWrapped($dialogId, $msgno++, $systemId, $this->blz, $this->username, $this->pin, [$hkkaz5]);
            $resp   = $this->conn->send($msg);
            $segs   = HbciMessage::parseAll($resp);
        }

        $this->endDialog($dialogId, $systemId, $msgno);

        if (HbciMessage::hasError($segs)) {
            $this->throwFirstError($segs, 'transaction fetch');
        }

        return $this->extractTransactions($segs);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Dialog helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Authenticated sync dialog (PIN-wrapped, systemId='0') → returns bank-assigned systemId.
     * Anonymous sync does not yield a usable systemId for subsequent PIN dialogs.
     */
    private function getSystemId(): string {
        $blzE  = HbciSegment::escape($this->blz);
        $userE = HbciSegment::escape($this->username);

        // Plain segs at 3, 4, 5 inside HNVSD
        $hkidn = "HKIDN:3:2+280:{$blzE}+{$userE}+0+1'";
        $hkvvb = "HKVVB:4:3+0+0+0+NEXUS+1.0'";
        $hksyn = "HKSYN:5:3+0'";

        // systemId='0' — we are requesting the bank to assign us one
        $msg  = HbciMessage::buildWrapped('0', 1, '0', $this->blz, $this->username, $this->pin, [$hkidn, $hkvvb, $hksyn]);
        $resp = $this->conn->send($msg);
        $segs = HbciMessage::parseAll($resp);

        $dialogId = HbciMessage::extractDialogId($segs);
        $systemId = $segs['HISYN'][0][1] ?? '0';

        $this->endDialog($dialogId, '0', 2);

        return $systemId ?: '0';
    }

    /**
     * Opens an authenticated dialog (HKIDN+HKVVB with PIN wrapper) → returns dialogId.
     */
    private function openDialog(string $systemId): string {
        $blzE  = HbciSegment::escape($this->blz);
        $userE = HbciSegment::escape($this->username);
        $hkidn = "HKIDN:3:2+280:{$blzE}+{$userE}+{$systemId}+1'";
        $hkvvb = "HKVVB:4:3+0+0+0+NEXUS+1.0'";

        $msg  = HbciMessage::buildWrapped('0', 1, $systemId, $this->blz, $this->username, $this->pin, [$hkidn, $hkvvb]);
        $resp = $this->conn->send($msg);
        $segs = HbciMessage::parseAll($resp);

        if (HbciMessage::hasError($segs)) {
            $this->throwFirstError($segs, 'dialog init');
        }
        return HbciMessage::extractDialogId($segs);
    }

    private function endDialog(string $dialogId, string $systemId, int $msgno): void {
        if ($dialogId === '0') {
            return;
        }
        try {
            $hkend = "HKEND:3:1+{$dialogId}'";
            $msg   = HbciMessage::buildWrapped($dialogId, $msgno, $systemId, $this->blz, $this->username, $this->pin, [$hkend]);
            $this->conn->send($msg);
        } catch (\Throwable) {
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Account helpers
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Returns the escaped Kti DEG string for HKSAL/HKCAZ/HKKAZ.
     * Format: iban:bic:kontonummer:unterkonto:kik.land:kik.blz
     */
    private function acctStr(): string {
        $kontonummer = strlen($this->iban) === 22
            ? ltrim(substr($this->iban, 12, 10), '0')
            : '';

        $parts = [$this->iban, '', $kontonummer, '', '280', $this->blz];
        return implode(':', array_map([HbciSegment::class, 'escape'], $parts));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Response extractors
    // ──────────────────────────────────────────────────────────────────────────

    private function extractBalance(array $segs): ?float {
        foreach ($segs['HISAL'] ?? [] as $des) {
            foreach (array_slice($des, 1) as $de) {
                // Saldo DEG format: <C|D>:<amount>:<currency>:<date>[:<time>]
                if (preg_match('/^(C|D):([\d,]+):[A-Z]{3}:\d{8}/', $de, $m)) {
                    $amount = (float) str_replace(',', '.', $m[2]);
                    return $m[1] === 'D' ? -$amount : $amount;
                }
            }
        }
        return null;
    }

    /** @return FinTsTransaction[] */
    private function extractTransactions(array $segs): array {
        $transactions = [];

        foreach (array_merge($segs['HICAZ'] ?? [], $segs['HIKAZ'] ?? []) as $des) {
            foreach ($des as $de) {
                if (! str_starts_with($de, '@')) {
                    continue;
                }
                $endAt = strpos($de, '@', 1);
                if ($endAt === false) {
                    continue;
                }
                $data  = substr($de, $endAt + 1);
                $isXml = str_starts_with(ltrim($data), '<');
                if ($isXml) {
                    // Strip UTF-8 BOM if present in CAMT XML
                    if (str_starts_with($data, "\xEF\xBB\xBF")) {
                        $data = substr($data, 3);
                    }
                } else {
                    // MT940 from German banks is ISO-8859-1; convert to UTF-8 if needed
                    if (!mb_check_encoding($data, 'UTF-8')) {
                        $data = mb_convert_encoding($data, 'UTF-8', 'ISO-8859-1');
                    }
                }
                $parsed = $isXml ? CamtParser::parse($data) : Mt940Parser::parse($data);

                $transactions = array_merge($transactions, $parsed);
            }
        }

        return $transactions;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Utilities
    // ──────────────────────────────────────────────────────────────────────────

    private function throwFirstError(array $segs, string $context): never {
        $errors = HbciMessage::extractErrors($segs);
        $msg    = $errors[0]['text'] ?? 'Unknown FinTS error';
        throw new \RuntimeException("Native FinTS {$context} failed: {$msg}");
    }

    private function cred(string $key): string {
        return (string) ($this->credentials["FINTS_{$key}"] ?? '');
    }

    private function resolveBundle(): string {
        $configured = ini_get('curl.cainfo');
        if ($configured && file_exists($configured)) {
            return $configured;
        }
        $fallback = base_path('vendor/composer/ca-bundle/res/cacert.pem');
        return file_exists($fallback) ? $fallback : '';
    }
}
