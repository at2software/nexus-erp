<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('marketing_performance_metrics', function (Blueprint $table) {
            $table->unsignedInteger('related_metric_id')->nullable()->after('kpi_color');
            $table->foreign('related_metric_id')
                ->references('id')->on('marketing_performance_metrics')
                ->nullOnDelete();
        });
    }
    public function down(): void {
        Schema::table('marketing_performance_metrics', function (Blueprint $table) {
            $table->dropForeign(['related_metric_id']);
            $table->dropColumn('related_metric_id');
        });
    }
};
