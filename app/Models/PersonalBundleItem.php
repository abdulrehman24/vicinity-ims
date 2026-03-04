<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PersonalBundleItem extends Model
{
    protected $fillable = ['personal_bundle_id', 'equipment_id', 'quantity'];

    public function bundle()
    {
        return $this->belongsTo(PersonalBundle::class, 'personal_bundle_id');
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
}
