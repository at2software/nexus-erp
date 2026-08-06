<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('milestones', function (Blueprint $table) {
            $table->unsignedBigInteger('ext_issue_plugin_link_id')->nullable()->after('user_id');
            $table->string('ext_issue_id')->nullable()->after('ext_issue_plugin_link_id');

            $table->foreign('ext_issue_plugin_link_id')
                ->references('id')->on('plugin_links')
                ->nullOnDelete();
        });
    }
    public function down(): void {
        Schema::table('milestones', function (Blueprint $table) {
            $table->dropForeign(['ext_issue_plugin_link_id']);
            $table->dropColumn(['ext_issue_plugin_link_id', 'ext_issue_id']);
        });
    }
};
