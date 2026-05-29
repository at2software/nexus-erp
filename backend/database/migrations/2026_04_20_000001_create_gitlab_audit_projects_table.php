<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('gitlab_audit_projects', function (Blueprint $table) {
            $table->id();
            $table->string('gitlab_url');
            $table->string('namespace_with_path');
            $table->string('project_name');
            $table->integer('gitlab_project_id')->nullable();
            $table->unsignedInteger('company_id')->nullable();
            $table->unsignedInteger('invoice_item_id')->nullable();
            $table->foreign('company_id')->references('id')->on('companies')->nullOnDelete();
            $table->foreign('invoice_item_id')->references('id')->on('invoice_items')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['gitlab_url', 'namespace_with_path']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('gitlab_audit_projects');
    }
};
