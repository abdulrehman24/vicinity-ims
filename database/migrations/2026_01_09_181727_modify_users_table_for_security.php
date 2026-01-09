<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Change is_admin to integer (0: User, 1: Admin, 2: Super Admin)
            $table->tinyInteger('is_admin')->default(0)->change();
            
            // Add security columns
            $table->string('pin')->nullable();
            $table->string('two_factor_code')->nullable();
            $table->dateTime('two_factor_expires_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->change();
            $table->dropColumn(['pin', 'two_factor_code', 'two_factor_expires_at']);
        });
    }
};
