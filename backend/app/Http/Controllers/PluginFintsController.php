<?php

namespace App\Http\Controllers;

use App\Exceptions\TanChallengeException;
use App\Helpers\CaAwareFinTs;
use App\Services\FinTs\FinTsDriverFactory;
use App\Services\FinTs\FinTsTransaction;
use App\Traits\HasVaultCredentials;
use Fhp\Action\GetBalance;
use Fhp\Action\GetSEPAAccounts;
use Fhp\FinTs;
use Fhp\Model\SEPAAccount;
use Fhp\Model\FlickerTan\SvgRenderer;
use Fhp\Model\FlickerTan\TanRequestChallengeFlicker;
use Fhp\Model\NoPsd2TanMode;
use Fhp\Model\TanRequestChallengeImage;
use Fhp\Options\Credentials;
use Fhp\Options\FinTsOptions;
use Fhp\Protocol\DialogInitialization;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PluginFintsController extends Controller {
    use HasVaultCredentials;

    const CACHE_TTL_PENDING = 300; // 5 minutes

    public function __construct(?array $credentials = null) {
        $this->credentials = $credentials;
        if (! $credentials) {
            try {
                if (DB::connection()->getDatabaseName()) {
                    $this->credentials = $this->getCredentials();
                }
            } catch (\Throwable) {
            }
        }
    }

    public function vaultPrefix(): string {
        return 'FINTS';
    }

    /**
     * Called by VaultController::store(). Probes NoPsd2 for quick credential validation,
     * then performs a full PSD2 login. Throws TanChallengeException when TAN is required.
     */
    public function checkCredentials(): bool {
        // --- 1. Quick NoPsd2 probe to validate credentials ---
        try {
            $fints       = $this->loginNoPsd2();
            $getAccounts = GetSEPAAccounts::create();
            $fints->execute($getAccounts);
            $iban    = $this->env('IBAN');
            $account = collect($getAccounts->getAccounts())
                ->first(fn (SEPAAccount $a) => $a->getIban() === $iban);
            if ($account) {
                $probe = GetBalance::create($account);
                $fints->execute($probe);
            }
        } catch (\Exception) {
            // NoPsd2 rejected → fall through to PSD2 login
        }

        // --- 2. Full PSD2 login ---
        $challengeId = (string) Str::uuid();
        $fints       = CaAwareFinTs::new($this->buildOptions(), $this->buildCredentials());

        $bpd      = $fints->getBpd();
        $tanModes = array_filter($bpd->allTanModes, fn ($m) => $m->isProzessvariante2());
        if (empty($tanModes)) {
            $tanModes = $bpd->allTanModes;
        }
        if (empty($tanModes)) {
            throw new \RuntimeException('No supported TAN modes available for this bank.');
        }
        $fints->selectTanMode(array_key_first($tanModes));

        $login = $fints->login();

        if (! $login->needsTan()) {
            return true;
        }

        // --- 3. TAN required — cache state and signal the frontend ---
        $challenge = $this->buildChallenge($login, $fints);
        Cache::put("fints_pending_{$challengeId}", [
            'fints'       => $fints->persist(),
            'action'      => serialize($login),
            'credentials' => $this->credentials,
        ], self::CACHE_TTL_PENDING);

        throw new TanChallengeException($challengeId, $challenge);
    }

    /**
     * Submits the TAN (or polls for decoupled confirmation).
     * Returns: true = success | false = decoupled still waiting | null = cache expired.
     */
    public function submitTan(string $challengeId, ?string $tan): ?bool {
        $pending = Cache::get("fints_pending_{$challengeId}");
        if (! $pending) {
            return null; // Expired
        }

        $fints = CaAwareFinTs::new($this->buildOptions(), $this->buildCredentials(), $pending['fints']);
        /** @var DialogInitialization $login */
        $login = unserialize($pending['action']);

        $tanMode = $fints->getSelectedTanMode();
        if ($tanMode && $tanMode->isDecoupled()) {
            $confirmed = $fints->checkDecoupledSubmission($login);
            if (! $confirmed) {
                Cache::put("fints_pending_{$challengeId}", array_merge($pending, [
                    'fints'  => $fints->persist(),
                    'action' => serialize($login),
                ]), self::CACHE_TTL_PENDING);
                return false; // Still waiting
            }
        } else {
            $fints->submitTan($login, $tan);
        }

        Cache::forget("fints_pending_{$challengeId}");
        return true;
    }

    /** @return FinTsTransaction[] */
    public function fetchTransactionsSince(\DateTime $since): array {
        return $this->driver()->fetchTransactionsSince($since);
    }

    public function fetchBalance(): ?float {
        return $this->driver()->fetchBalance();
    }

    // ---- private helpers ----

    private function driver(): \App\Services\FinTs\FinTsDriverInterface {
        return FinTsDriverFactory::create($this->credentials ?? []);
    }

    private function buildOptions(): FinTsOptions {
        // On Windows (Laragon etc.) the php.ini curl.cainfo may point to a missing file.
        // Fall back to the CA bundle that ships with Composer so SSL verification still works.
        $caFile = ini_get('curl.cainfo');
        if (! $caFile || ! file_exists($caFile)) {
            $bundle = base_path('vendor/composer/ca-bundle/res/cacert.pem');
            if (file_exists($bundle)) {
                ini_set('curl.cainfo', $bundle);
                ini_set('openssl.cafile', $bundle);
            }
        }

        $options                 = new FinTsOptions();
        $options->url            = $this->env('URL');
        $options->bankCode       = $this->env('BLZ');
        $options->productName    = 'NEXUS';
        $options->productVersion = '1.0';
        return $options;
    }

    private function buildCredentials(): Credentials {
        return Credentials::create((string) $this->env('USERNAME'), (string) $this->env('PIN'));
    }

    private function loginNoPsd2(): FinTs {
        $fints = CaAwareFinTs::new($this->buildOptions(), $this->buildCredentials());
        $fints->selectTanMode(NoPsd2TanMode::ID);
        $login = $fints->login();
        if ($login->needsTan()) {
            throw new \RuntimeException('NoPsd2 login still needed TAN');
        }
        return $fints;
    }

    private function buildChallenge(DialogInitialization $login, FinTs $fints): array {
        $tanRequest = $login->getTanRequest();
        $challenge  = [
            'text'   => $tanRequest->getChallenge(),
            'medium' => $tanRequest->getTanMediumName(),
        ];

        $tanMode = $fints->getSelectedTanMode();
        if ($tanMode && $tanMode->isDecoupled()) {
            $challenge['type'] = 'decoupled';
            return $challenge;
        }

        if ($hhd = $tanRequest->getChallengeHhdUc()) {
            try {
                $flicker           = new TanRequestChallengeFlicker($hhd);
                $svg               = new SvgRenderer($flicker->getFlickerPattern());
                $challenge['type'] = 'flickertan';
                $challenge['svg']  = $svg->getImage();
            } catch (\InvalidArgumentException) {
                $image             = new TanRequestChallengeImage($hhd);
                $challenge['type'] = 'phototan';
                $challenge['image'] = 'data:'.$image->getMimeType().';base64,'.base64_encode($image->getData());
            }
            return $challenge;
        }

        $challenge['type'] = 'tan';
        return $challenge;
    }
}
