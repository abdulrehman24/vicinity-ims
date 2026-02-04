<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EquipmentLog extends Model
{
    protected $fillable = [
        'equipment_id',
        'user_id',
        'user_name',
        'action',
        'previous_status',
        'new_status',
        'description',
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
