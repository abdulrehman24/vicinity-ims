<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollaborationInvite extends Model
{
    protected $fillable = [
        'booking_id',
        'email',
        'token',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function isValid()
    {
        return $this->is_active && $this->expires_at->isFuture();
    }
}
