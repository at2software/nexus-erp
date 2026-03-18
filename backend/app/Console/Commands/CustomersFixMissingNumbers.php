<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\Param;
use App\Models\SmartSql;
use Illuminate\Console\Command;

class CustomersFixMissingNumbers extends Command {
    protected $signature   = 'customers:fixMissingNumbers';
    protected $description = 'Automatically adds customer numbers to thos companies without ';

    public function __construct() {
        parent::__construct();
    }
    private function isUnique($number) {
        return ! Company::where('customer_number', $number)->exists();
    }
    public function handle() {
        $n       = Param::get('CUSTOMER_NUMBER_CURRENT');
        $p       = Param::get('CUSTOMER_NUMBER_PREFIX');
        $s       = Param::get('CUSTOMER_NUMBER_SUFFIX');
        $current = $n->value;

        $smart     = new SmartSql('companies', 'customer_number');
        $companies = Company::whereCustomerNumberIsMissing()->get();
        $bar       = $this->output->createProgressBar(count($companies));
        foreach ($companies as $company) {
            $unique = false;
            while (! $unique) {
                $name   = $p->value.$current.$s->value;
                $unique = $this->isUnique($name);
                if (! $unique) {
                    $current++;
                }
            }
            $smart->add($company->id, $p->value.$current.$s->value);
            $current++;
            $bar->advance();
        }
        $bar->finish();
        $smart->save();
        $n->value = $current;
        $n->save();
        $stillMissing = Company::whereCustomerNumberIsMissing()->exists();
        return $stillMissing ? Command::INVALID : Command::SUCCESS;
    }
}
