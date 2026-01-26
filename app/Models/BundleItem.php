<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BundleItem extends Model
{
    use HasFactory;

    protected $fillable = ['bundle_id', 'equipment_id', 'quantity'];

    public function bundle()
    {
        return $this->belongsTo(Bundle::class);
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
}
