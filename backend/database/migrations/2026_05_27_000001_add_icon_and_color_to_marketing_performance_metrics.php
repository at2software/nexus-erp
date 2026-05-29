<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('marketing_performance_metrics', function (Blueprint $table) {
            $table->string('kpi_icon')->nullable()->after('target_value');
            $table->string('kpi_color')->nullable()->after('kpi_icon');
        });
    }

    public function down(): void {
        Schema::table('marketing_performance_metrics', function (Blueprint $table) {
            $table->dropColumn(['kpi_icon', 'kpi_color']);
        });
    }
};
