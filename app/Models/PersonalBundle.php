<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PersonalBundle extends Model
{
    protected $fillable = ['user_id', 'name', 'description'];

    public function items()
    {
        return $this->hasMany(PersonalBundleItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
