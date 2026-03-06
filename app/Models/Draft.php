<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Draft extends Model
{
    protected $fillable = [
        'user_id',
        'project_title',
        'quotation_number',
        'shoot_type',
        'start_date',
        'end_date',
        'shift',
        'remarks',
        'collaborators',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'collaborators' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(DraftItem::class);
    }
}
