<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollaborationInvite extends Model
{
    protected $fillable = [
        'booking_id',
        'email',
        'token',
        'access_level',
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
        if (! $this->is_active) {
            return false;
        }

        if ($this->access_level === 'view') {
            return true;
        }

        return $this->expires_at && $this->expires_at->isFuture();
    }
}
