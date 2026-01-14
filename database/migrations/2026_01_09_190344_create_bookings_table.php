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
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('project_title');
            $table->string('quotation_number')->nullable();
            $table->string('shoot_type')->default('Commercial');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('shift')->default('Full Day'); // Full Day, AM, PM
            $table->string('status')->default('active'); // active, returned, cancelled
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
