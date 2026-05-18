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
        Schema::table('collaboration_invites', function (Blueprint $table) {
            $table->string('access_level', 16)->default('edit')->after('token');
            $table->string('email')->nullable()->change();
            $table->timestamp('expires_at')->nullable()->change();
            $table->index(['booking_id', 'access_level', 'is_active'], 'collab_invites_booking_level_active_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('collaboration_invites', function (Blueprint $table) {
            $table->dropIndex('collab_invites_booking_level_active_idx');
            $table->dropColumn('access_level');
            $table->string('email')->nullable(false)->change();
            $table->timestamp('expires_at')->nullable(false)->change();
        });
    }
};
