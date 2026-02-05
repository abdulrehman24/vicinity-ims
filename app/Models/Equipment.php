<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Equipment extends Model
{
    protected $fillable = [
        'name',
        'category',
        'equipment_type',
        'serial_number',
        'status',
        'business_unit',
        'condition',
        'location',
        'image_path',
        'purchase_date',
        'remarks',
        'decommission_date',
        'decommission_reason',
        'repair_start_date',
        'total_quantity',
        'next_audit_date',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'decommission_date' => 'date',
        'repair_start_date' => 'date',
        'next_audit_date' => 'date',
    ];
}
