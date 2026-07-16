<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Tracker-agnostic link to an external issue. The plugin link resolves both the
        // tracker type and the external project/instance; each user supplies their own
        // credentials (encryption) at runtime. The issue id is a string for universality
        // (e.g. GitLab uses project-scoped iids) and orphaned ids are retained when the
        // plugin link is removed. Lives on invoice_items (the budget line ↔ issue, the
        // primary link) and on foci (the direct link for foci without an invoice item).
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->unsignedBigInteger('ext_issue_plugin_link_id')->nullable()->after('product_source_id');
            $table->string('ext_issue_id')->nullable()->after('ext_issue_plugin_link_id');

            $table->foreign('ext_issue_plugin_link_id')
                ->references('id')->on('plugin_links')
                ->nullOnDelete();
        });

        Schema::table('foci', function (Blueprint $table) {
            $table->unsignedBigInteger('ext_issue_plugin_link_id')->nullable()->after('invoiced_in_item_id');
            $table->string('ext_issue_id')->nullable()->after('ext_issue_plugin_link_id');

            $table->foreign('ext_issue_plugin_link_id')
                ->references('id')->on('plugin_links')
                ->nullOnDelete();
        });
    }
    public function down(): void {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropForeign(['ext_issue_plugin_link_id']);
            $table->dropColumn(['ext_issue_plugin_link_id', 'ext_issue_id']);
        });
        Schema::table('foci', function (Blueprint $table) {
            $table->dropForeign(['ext_issue_plugin_link_id']);
            $table->dropColumn(['ext_issue_plugin_link_id', 'ext_issue_id']);
        });
    }
};
