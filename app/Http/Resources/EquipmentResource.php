<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'equipmentType' => $this->equipment_type,
            'serialNumber' => $this->serial_number,
            'status' => $this->status,
            'businessUnit' => $this->business_unit,
            'condition' => $this->condition,
            'location' => $this->location,
            'image' => $this->image_path,
            'totalQuantity' => $this->total_quantity,
            'purchaseDate' => $this->purchase_date ? $this->purchase_date->format('Y-m-d') : null,
            'remarks' => $this->remarks,
            'decommissionDate' => $this->decommission_date ? $this->decommission_date->format('Y-m-d') : null,
            'decommissionReason' => $this->decommission_reason,
            'repairStartDate' => $this->repair_start_date ? $this->repair_start_date->format('Y-m-d') : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
