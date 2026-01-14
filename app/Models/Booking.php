<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = [
        'user_id',
        'equipment_id',
        'quantity',
        'project_title',
        'quotation_number',
        'shoot_type',
        'start_date',
        'end_date',
        'shift',
        'status',
        'returned_at',
        'return_notes',
        'return_condition',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'returned_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
}
