<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Restore any incorrectly soft-deleted records
        DB::table('debrief_problems')->whereNotNull('deleted_at')->update(['deleted_at' => null]);
        DB::table('debrief_positives')->whereNotNull('deleted_at')->update(['deleted_at' => null]);

        // Create many-to-many pivot table for positives <-> debriefs
        Schema::dropIfExists('debrief_positive_project_debrief');
        Schema::create('debrief_positive_project_debrief', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('debrief_positive_id');
            $table->unsignedInteger('debrief_project_debrief_id');
            $table->unsignedInteger('reported_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('debrief_positive_id', 'dpospd_positive_fk')
                ->references('id')->on('debrief_positives')->onDelete('cascade');
            $table->foreign('debrief_project_debrief_id', 'dpospd_debrief_fk')
                ->references('id')->on('debrief_project_debriefs')->onDelete('cascade');
            $table->foreign('reported_by_user_id', 'dpospd_user_fk')
                ->references('id')->on('users')->onDelete('set null');
        });

        // Migrate existing positives to the pivot table
        DB::statement('
            INSERT INTO debrief_positive_project_debrief
                (debrief_positive_id, debrief_project_debrief_id, reported_by_user_id, created_at, updated_at)
            SELECT id, debrief_project_debrief_id, reported_by_user_id, created_at, NOW()
            FROM debrief_positives
            WHERE debrief_project_debrief_id IS NOT NULL
        ');

        // Drop FK constraint and make column nullable (no longer the primary relationship)
        DB::statement('ALTER TABLE debrief_positives DROP FOREIGN KEY debrief_positives_debrief_project_debrief_id_foreign');
        DB::statement('ALTER TABLE debrief_positives MODIFY COLUMN debrief_project_debrief_id INT UNSIGNED NULL');
    }
    public function down(): void {
        // Restore debrief_project_debrief_id from pivot data
        DB::statement('
            UPDATE debrief_positives dp
            JOIN debrief_positive_project_debrief dpd ON dp.id = dpd.debrief_positive_id
            SET dp.debrief_project_debrief_id = dpd.debrief_project_debrief_id
        ');

        DB::statement('ALTER TABLE debrief_positives MODIFY COLUMN debrief_project_debrief_id INT UNSIGNED NOT NULL');

        try {
            DB::statement('ALTER TABLE debrief_positives ADD CONSTRAINT debrief_positives_debrief_project_debrief_id_foreign FOREIGN KEY (debrief_project_debrief_id) REFERENCES debrief_project_debriefs (id) ON DELETE CASCADE');
        } catch (Exception $e) {
            // Ignore if constraint can't be re-added due to data inconsistency
        }

        Schema::dropIfExists('debrief_positive_project_debrief');
    }
};
