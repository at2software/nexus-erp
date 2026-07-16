<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Model 2 (early-warning) prediction, refreshed by cron:check-project-overrun-predictions.
        // Final hours = hours logged so far + predicted remaining, directly comparable to
        // work_estimated. Null until a running project has both a trained model and a
        // known started_at (see App\ML\ProjectEarlyWarningModel::predictFinal()).
        Schema::table('projects', function (Blueprint $table) {
            $table->double('ml_predicted_hours')->nullable()->after('work_estimated');
            $table->timestamp('ml_predicted_at')->nullable()->after('ml_predicted_hours');
        });
    }
    public function down(): void {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['ml_predicted_hours', 'ml_predicted_at']);
        });
    }
};
