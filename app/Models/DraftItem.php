<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DraftItem extends Model
{
    protected $fillable = [
        'draft_id',
        'equipment_id',
        'quantity',
    ];

    public function draft()
    {
        return $this->belongsTo(Draft::class);
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
}
