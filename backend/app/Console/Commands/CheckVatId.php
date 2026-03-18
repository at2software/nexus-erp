<?php

namespace App\Console\Commands;

use App\Models\Comment;
use Illuminate\Console\Command;

class CheckVatId extends Command {
    protected $signature   = 'vat_id:check {company}';
    protected $description = 'Checks validity of a given VAT ID';

    const URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/%s/vat/%s';

    public static $REGEX_QUICKCHECK = [
        'BE[0-9]{10}', 'BG[0-9]{9,10}', 'DK[0-9]{8}', 'DE[0-9]{9}', 'EE[0-9]{9}', 'FI[0-9]{8}',
        'FR[A-Z0-9]{2}[0-9]{9}', 'EL[0-9]{9}', 'IE[0-9][A-Z0-9][0-9]{5}[A-Z]', 'IE[0-9]{7}[A-W][A-I]',
        'IT[0-9]{11}', 'HR[0-9]{11}', 'LV[0-9]{11}', 'LT[0-9]{9}', 'LT[0-9]{12}', 'LU[0-9]{8}',
        'MT[0-9]{8}', 'NL[A-Z0-9]{9}B[A-Z0-9]{2}', 'ATU[A-Z0-9]{8}', 'PL[0-9]{10}', 'PT[0-9]{9}',
        'RO[1-9][0-9]{,9}', 'SE[0-9]{10}01', 'SK[0-9]{10}', 'SI[0-9]{8}', 'ES[A-Z0-9][0-9]{7}[A-Z0-9]',
        'CZ[0-9]{8,10}', 'HU[0-9]{8}', 'CY[A-Z0-9]{8}[A-Z]',
    ];
    private $checkVatId       = null;
    private $response         = null;
    private $company;
    private $isValid          = false;
    private $errorDescription = 'unprocessed';

    public function handle() {
        $this->company    = $this->argument('company');
        $this->checkVatId = $this->company->vat_id;
        if (! $this->checkVatId) {
            $this->errorDescription = 'company has no VAT ID to check';
            $this->logResult();
            return;
        }

        if ($this->quickCheck()) {
            if ($this->check()) {
                $this->isValid          = true;
                $this->errorDescription = $this->getSuccessMessage();
            } else {
                $this->errorDescription = $this->getErrorMessage();
            }
        }
        $this->logResult();
        $this->info(json_encode([
            'is_valid'          => $this->isValid,
            'error_description' => $this->errorDescription,
        ]));
    }
    private function logResult() {
        Comment::create([
            'text' => 'VAT-Check: '.$this->errorDescription,
            'type' => $this->isValid ? 1 : 2,
            ...$this->company->toPoly(),
        ]);
    }

    public $finalUrl;

    public function quickCheck() {
        foreach (self::$REGEX_QUICKCHECK as $regex) {
            if (preg_match('/'.$regex.'/is', $this->checkVatId)) {
                return true;
            }
        }
        $this->errorDescription = 'implausible VAT number';
        return false;
    }
    public function check() {
        $countryCode = substr($this->checkVatId, 0, 2);
        $vatNumber   = substr($this->checkVatId, 2);

        $this->finalUrl = sprintf(self::URL, $countryCode, $vatNumber);

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl, CURLOPT_URL, $this->finalUrl);
        curl_setopt($curl, CURLOPT_TIMEOUT, 30);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);

        $resp      = curl_exec($curl);
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($resp === false || $resp === '') {
            $this->errorDescription = 'VAT service unavailable: '.($curlError ?: 'empty response');
            return false;
        }

        $this->response = json_decode($resp);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->errorDescription = 'VAT service returned invalid response';
            return false;
        }

        return $this->response->isValid ?? false;
    }
    private function getSuccessMessage() {
        $message = 'Die angefragte USt-IdNr. ist gültig.';
        if (! empty($this->response->name)) {
            $message .= ' ('.trim($this->response->name).')';
        }
        return $message;
    }
    private function getErrorMessage() {
        if (! $this->response) {
            return $this->errorDescription;
        }

        return match ($this->response->userError ?? null) {
            'VALID'                     => 'Die angefragte USt-IdNr. ist gültig.',
            'INVALID'                   => 'Die angefragte USt-IdNr. ist ungültig.',
            'INVALID_INPUT'             => 'Ungültige Eingabe (Ländercode oder USt-IdNr. fehlerhaft).',
            'SERVICE_UNAVAILABLE'       => 'Der VIES-Dienst ist derzeit nicht verfügbar.',
            'MS_UNAVAILABLE'            => 'Der Dienst des angefragten EU-Mitgliedstaates ist nicht verfügbar.',
            'TIMEOUT'                   => 'Zeitüberschreitung bei der Anfrage.',
            'MS_MAX_CONCURRENT_REQ'     => 'Zu viele gleichzeitige Anfragen. Bitte später erneut versuchen.',
            'GLOBAL_MAX_CONCURRENT_REQ' => 'Zu viele gleichzeitige Anfragen. Bitte später erneut versuchen.',
            default                     => 'Die angefragte USt-IdNr. ist ungültig. ('.($this->response->userError ?? 'unknown').')',
        };
    }
}
