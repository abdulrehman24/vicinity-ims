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
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->string('equipment_type');
            $table->string('serial_number')->unique();
            $table->string('status')->default('available');
            $table->string('business_unit');
            $table->string('condition')->default('excellent');
            $table->string('location')->nullable();
            $table->string('image_path')->nullable();
            $table->date('purchase_date')->nullable();
            $table->text('remarks')->nullable();
            $table->date('decommission_date')->nullable();
            $table->text('decommission_reason')->nullable();
            $table->date('repair_start_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
