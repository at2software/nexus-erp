<?php

namespace App\Services\FinTs\Native;

/**
 * Builds and parses FinTS 3.0 PIN/TAN messages (NoPsd2 / TAN method 999).
 *
 * Wire format (outer):
 *   HNHBK(1) + HNVSK(998) + HNVSD(999, contains inner) + HNHBS(N)
 *
 * Wire format (inner, inside HNVSD @len@):
 *   HNSHK(2) + plain-segments(3..N) + HNSHA(N+1)
 *
 * For NoPsd2 the "encryption" is identity — inner content is plaintext.
 * The outer sequence numbers for HNVSK/HNVSD are always 998/999.
 * HNHBS outer seq = count(inner-plain-segs) + 4  (2=HNSHK, N+1=HNSHA, 998=HNVSK, 999=HNVSD, +1=HNHBS itself).
 */
class HbciMessage {
    // ──────────────────────────────────────────────────────────────
    // Building
    // ──────────────────────────────────────────────────────────────

    /**
     * Builds a complete FinTS 3.0 PIN/TAN message with full security wrapper.
     *
     * Inner plain segments should be pre-formatted strings (including trailing "'")
     * and numbered starting at seq 3.
     *
     * @param string   $dialogId  '0' for new dialogs
     * @param int      $msgno     Message counter for this dialog (starts at 1)
     * @param string   $systemId  System ID from sync ('0' before first sync)
     * @param string   $blz       Bank routing code (BLZ)
     * @param string   $username  Online banking username
     * @param string   $pin       PIN
     * @param string[] $plainSegs Pre-formatted inner segment strings at seq 3+
     */
    public static function buildWrapped(
        string $dialogId,
        int    $msgno,
        string $systemId,
        string $blz,
        string $username,
        string $pin,
        array  $plainSegs,
    ): string {
        $n    = count($plainSegs);
        $now  = new \DateTime('now', new \DateTimeZone('UTC'));
        $date = $now->format('Ymd');
        $time = $now->format('His');
        $ref  = (string) random_int(1000000, 9999999);

        $blzE  = HbciSegment::escape($blz);
        $userE = HbciSegment::escape($username);
        $pinE  = HbciSegment::escape($pin);

        // Inner: HNSHK at seq 2, plain segs at 3..N+2, HNSHA at N+3
        $hnshk = "HNSHK:2:4+PIN:1+999+{$ref}+1+1+1::{$systemId}+1+1:{$date}:{$time}+1:999:1+6:10:19+280:{$blzE}:{$userE}:S:0:0'";
        $hnsha = 'HNSHA:' . ($n + 3) . ":2+{$ref}++{$pinE}'";
        $innerContent = $hnshk . implode('', $plainSegs) . $hnsha;

        // Outer: HNVSK at 998, HNVSD at 999, HNHBS at N+4
        // @8@00000000 = 8 ASCII '0' bytes (dummy key, NoPsd2)
        $dummyKey = str_repeat('0', 8);
        $hnvsk = "HNVSK:998:3+PIN:1+998+1+1::{$systemId}+1:{$date}:{$time}+2:2:13:@8@{$dummyKey}:5:1+280:{$blzE}:{$userE}:V:0:0+0'";
        $hnvsd = 'HNVSD:999:1+@' . strlen($innerContent) . '@' . $innerContent . "'";
        $hnhbs = 'HNHBS:' . ($n + 4) . ":1+{$msgno}'";

        $body = $hnvsk . $hnvsd . $hnhbs;
        return self::buildHeader($dialogId, $msgno, $body) . $body;
    }

    /**
     * Builds a plain (unwrapped) message — for HKEND only, where no PIN wrapper is needed.
     */
    public static function buildPlain(string $dialogId, int $msgno, array $segs): string {
        $body = implode('', $segs);
        return self::buildHeader($dialogId, $msgno, $body) . $body;
    }

    private static function buildHeader(string $dialogId, int $msgno, string $body): string {
        $placeholder = "HNHBK:1:3+000000000000+300+{$dialogId}+{$msgno}'";
        $total       = strlen($placeholder) + strlen($body);
        return 'HNHBK:1:3+' . str_pad($total, 12, '0', STR_PAD_LEFT) . "+300+{$dialogId}+{$msgno}'";
    }

    // ──────────────────────────────────────────────────────────────
    // Parsing
    // ──────────────────────────────────────────────────────────────

    /**
     * Parses a response and returns all segments (outer + inner from HNVSD merged).
     *
     * @return array<string, list<array<int, string>>>
     */
    public static function parseAll(string $message): array {
        $outer = self::parseSegments($message);

        if (isset($outer['HNVSD'][0][1])) {
            $innerText = self::extractBinaryDe($outer['HNVSD'][0][1]);
            $inner     = self::parseSegments($innerText);
            return array_merge_recursive($outer, $inner);
        }

        return $outer;
    }

    /**
     * @return array<string, list<array<int, string>>>
     */
    public static function parseSegments(string $message): array {
        $segments = [];
        $pos      = 0;
        $len      = strlen($message);

        while ($pos < $len) {
            $end = self::findUnescaped($message, "'", $pos);
            if ($end === false) {
                break;
            }
            $seg = substr($message, $pos, $end - $pos);
            $pos = $end + 1;

            if ($seg === '') {
                continue;
            }

            $colonPos = strpos($seg, ':');
            $name     = $colonPos !== false ? substr($seg, 0, $colonPos) : $seg;

            $segments[$name][] = self::splitUnescaped($seg, '+');
        }

        return $segments;
    }

    public static function extractDialogId(array $segments): string {
        return $segments['HNHBK'][0][3] ?? '0';
    }

    /**
     * @return array<int, array{code: string, text: string, ref: string}>
     */
    public static function extractErrors(array $segments): array {
        $errors = [];
        foreach (['HIRMG', 'HIRMS'] as $name) {
            foreach ($segments[$name] ?? [] as $des) {
                // The reference segment number (HIRMS only) is the 4th colon-field of the
                // segment header ($des[0] = "HIRMS:seq:ver:refseq"), NOT a separate DE.
                // Result code DEGs therefore start at $des[1].
                $headerParts = explode(':', $des[0] ?? '');
                $ref         = $headerParts[3] ?? '';

                foreach (array_slice($des, 1) as $rde) {
                    $parts = self::splitUnescaped($rde, ':');
                    $code  = $parts[0] ?? '';
                    $text  = self::unescape($parts[2] ?? '');
                    if ($code !== '') {
                        $errors[] = ['code' => $code, 'text' => $text, 'ref' => $ref];
                    }
                }
            }
        }
        return $errors;
    }

    public static function hasError(array $segments): bool {
        foreach (self::extractErrors($segments) as $e) {
            if (str_starts_with($e['code'], '9')) {
                return true;
            }
        }
        return false;
    }

    // ──────────────────────────────────────────────────────────────
    // String helpers
    // ──────────────────────────────────────────────────────────────

    public static function findUnescaped(string $haystack, string $needle, int $offset = 0): int|false {
        $pos  = $offset;
        $len  = strlen($haystack);
        $nLen = strlen($needle);

        while ($pos < $len) {
            // Skip binary elements @len@<data> — content may contain any byte including "'"
            if ($haystack[$pos] === '@') {
                $endAt = strpos($haystack, '@', $pos + 1);
                if ($endAt !== false) {
                    $binLen = (int) substr($haystack, $pos + 1, $endAt - $pos - 1);
                    $pos    = $endAt + 1 + $binLen;
                    continue;
                }
            }
            // Skip escaped characters
            if ($haystack[$pos] === '?') {
                $pos += 2;
                continue;
            }
            if (substr($haystack, $pos, $nLen) === $needle) {
                return $pos;
            }
            $pos++;
        }
        return false;
    }

    public static function splitUnescaped(string $string, string $delimiter): array {
        $parts = [];
        $start = 0;
        $len   = strlen($string);
        $pos   = 0;

        while ($pos < $len) {
            if ($string[$pos] === '?') {
                $pos += 2;
                continue;
            }
            if ($string[$pos] === '@') {
                $endAt = strpos($string, '@', $pos + 1);
                if ($endAt !== false) {
                    $binLen = (int) substr($string, $pos + 1, $endAt - $pos - 1);
                    $pos    = $endAt + 1 + $binLen;
                    continue;
                }
            }
            if (substr($string, $pos, strlen($delimiter)) === $delimiter) {
                $parts[] = substr($string, $start, $pos - $start);
                $start   = $pos + strlen($delimiter);
                $pos     = $start;
                continue;
            }
            $pos++;
        }
        $parts[] = substr($string, $start);
        return $parts;
    }

    public static function unescape(string $value): string {
        return str_replace(['??', '?+', '?:', "?'"], ['?', '+', ':', "'"], $value);
    }

    private static function extractBinaryDe(string $de): string {
        if (str_starts_with($de, '@')) {
            $endAt = strpos($de, '@', 1);
            if ($endAt !== false) {
                return substr($de, $endAt + 1);
            }
        }
        return $de;
    }
}
