<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->tinyInteger('stage')->default(0)->after('type')
                ->comment('0=regular, 1=support, 2=downpayment');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->tinyInteger('stage')->default(0)->after('is_cancelled')
                ->comment('0=regular, 1=support, 2=downpayment');
        });

        // Migrate PreparedSupport (41) → Default (0) with stage=1
        DB::table('invoice_items')->where('type', 41)->update(['type' => 0, 'stage' => 1]);
    }
    public function down(): void {
        // Revert migrated items back to PreparedSupport
        DB::table('invoice_items')->where('type', 0)->where('stage', 1)->update(['type' => 41, 'stage' => 0]);

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn('stage');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('stage');
        });
    }
};
