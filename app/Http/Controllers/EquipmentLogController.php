<?php

namespace App\Http\Controllers;

use App\Models\EquipmentLog;
use Illuminate\Http\Request;

class EquipmentLogController extends Controller
{
    public function index($equipmentId)
    {
        $logs = EquipmentLog::where('equipment_id', $equipmentId)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->get();
            
        return response()->json(['data' => $logs]);
    }
}
