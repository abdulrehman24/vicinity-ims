<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicket extends Model
{
    protected $fillable = [
        'ticket_code',
        'equipment_id',
        'issue_type',
        'severity',
        'description',
        'reported_by',
        'status',
        'quantity',
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
}
