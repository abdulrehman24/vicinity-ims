<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = [
        'user_id',
        'project_title',
        'quotation_number',
        'shoot_type',
        'start_date',
        'end_date',
        'shift',
        'collaborators',
        'status',
        'returned_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'returned_at' => 'datetime',
        'collaborators' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function equipments()
    {
        return $this->belongsToMany(Equipment::class, 'booking_equipment')
            ->withPivot(['id', 'quantity', 'status', 'returned_at', 'return_condition', 'return_notes'])
            ->withTimestamps();
    }

    public function dates()
    {
        return $this->hasMany(BookingDate::class);
    }
}
