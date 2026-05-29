<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('marketing_prospect_activities', function (Blueprint $table) {
            $table->unsignedInteger('bumps')->default(0)->after('performance_value');
        });
    }

    public function down(): void {
        Schema::table('marketing_prospect_activities', function (Blueprint $table) {
            $table->dropColumn('bumps');
        });
    }
};
