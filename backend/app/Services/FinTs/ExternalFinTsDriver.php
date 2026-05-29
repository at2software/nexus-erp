<?php

namespace App\Services\FinTs;

use App\Helpers\CaAwareFinTs;
use App\Helpers\NLog;
use Fhp\Action\GetBalance;
use Fhp\Action\GetSEPAAccounts;
use Fhp\Action\GetStatementOfAccount;
use Fhp\Model\SEPAAccount;
use Fhp\Model\StatementOfAccount\Transaction as NemiahTransaction;
use Fhp\Options\Credentials;
use Fhp\Options\FinTsOptions;

class ExternalFinTsDriver implements FinTsDriverInterface {
    public function __construct(private array $credentials) {}

    public function fetchBalance(): ?float {
        $fints       = $this->loginFull();
        $getAccounts = GetSEPAAccounts::create();
        $fints->execute($getAccounts);

        $iban    = $this->cred('IBAN');
        $account = collect($getAccounts->getAccounts())
            ->first(fn (SEPAAccount $a) => $a->getIban() === $iban);

        if (! $account) {
            NLog::error('FinTS: configured IBAN not found in account list', ['iban' => $iban]);
            return null;
        }

        $getBalance = GetBalance::create($account);
        $fints->execute($getBalance);
        $balances = $getBalance->getBalances();
        if (empty($balances)) {
            NLog::error('FinTS: no balance segment returned by bank');
            return null;
        }

        return (float) $balances[0]->getGebuchterSaldo()->getAmount();
    }

    public function fetchTransactionsSince(\DateTime $since): array {
        $fints       = $this->loginFull();
        $getAccounts = GetSEPAAccounts::create();
        $fints->execute($getAccounts);

        $iban    = $this->cred('IBAN');
        $account = collect($getAccounts->getAccounts())
            ->first(fn (SEPAAccount $a) => $a->getIban() === $iban);

        if (! $account) {
            NLog::error('FinTS: IBAN not found for statement fetch', ['iban' => $iban]);
            return [];
        }

        $getStatement = GetStatementOfAccount::create($account, $since, new \DateTime());
        $fints->execute($getStatement);

        // nemiah uses 'credit'/'debit'; we normalise to our 'C'/'D' constants
        return collect($getStatement->getStatement()->getStatements())
            ->flatMap(fn ($s) => $s->getTransactions())
            ->map(fn (NemiahTransaction $t) => new FinTsTransaction(
                $t->getCreditDebit() === NemiahTransaction::CD_CREDIT
                    ? FinTsTransaction::CD_CREDIT
                    : FinTsTransaction::CD_DEBIT,
                (float) $t->getAmount(),
                $t->getName(),
                $t->getMainDescription(),
                $t->getBookingDate(),
                $t->isStorno(),
            ))
            ->all();
    }

    private function loginFull(): \Fhp\FinTs {
        $fints    = CaAwareFinTs::new($this->buildOptions(), $this->buildCredentials());
        $bpd      = $fints->getBpd();
        $tanModes = array_filter($bpd->allTanModes, fn ($m) => $m->isProzessvariante2());
        if (empty($tanModes)) {
            $tanModes = $bpd->allTanModes;
        }
        if (! empty($tanModes)) {
            $fints->selectTanMode(array_key_first($tanModes));
        }
        $login = $fints->login();
        if ($login->needsTan()) {
            throw new \RuntimeException('FinTS session has expired. Please re-authenticate via vault settings.');
        }
        return $fints;
    }

    private function buildOptions(): FinTsOptions {
        $caFile = ini_get('curl.cainfo');
        if (! $caFile || ! file_exists($caFile)) {
            $bundle = base_path('vendor/composer/ca-bundle/res/cacert.pem');
            if (file_exists($bundle)) {
                ini_set('curl.cainfo', $bundle);
                ini_set('openssl.cafile', $bundle);
            }
        }

        $options                 = new FinTsOptions();
        $options->url            = $this->cred('URL');
        $options->bankCode       = $this->cred('BLZ');
        $options->productName    = 'NEXUS';
        $options->productVersion = '1.0';
        return $options;
    }

    private function buildCredentials(): Credentials {
        return Credentials::create((string) $this->cred('USERNAME'), (string) $this->cred('PIN'));
    }

    private function cred(string $key): ?string {
        return $this->credentials["FINTS_{$key}"] ?? null;
    }
}
