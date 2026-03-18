<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

abstract class ParamsTableBase extends Migration {
    public static function TABLE_NAME(): string {
        return 'error';
    }
    public function _up($_) {
        $class = get_called_class();
        Schema::create($class::TABLE_NAME(), function (Blueprint $table) use ($_) {
            $table->increments('id');
            $table->timestamps();
            $table->string('language')->index()->nullable()->default(null);
            $table->integer('parent_id')->unsigned()->nullable()->default(null)->index();
            $table->string('parent_type')->nullable()->default(null)->index();
            $table->integer('param_id')->unsigned()->index();
            $table->foreign('param_id')->references('id')->on('params')->onDelete('cascade');
            $table->integer('user_id')->unsigned()->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->integer('flags')->unsigned();
            $_($table);
        });
    }
    public function down() {
        $class = get_called_class();
        Schema::table($class::TABLE_NAME(), function ($table) {
            $table->dropForeign(['user_id']);
        });
        Schema::dropIfExists($class::TABLE_NAME());
    }
}
