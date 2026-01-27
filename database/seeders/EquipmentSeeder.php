<?php

namespace Database\Seeders;

use App\Models\Equipment;
use Illuminate\Database\Seeder;

class EquipmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            [
                'name' => 'CANON EOS C70',
                'category' => 'Camera Body',
                'equipment_type' => 'Camera',
                'serial_number' => 'C70001',
                'status' => 'available',
                'total_quantity' => 1,
                'purchase_date' => '2023-01-15',
                'business_unit' => 'Studio',
                'condition' => 'excellent',
                'location' => 'Studio A',
                'image_path' => 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=300&fit=crop',
            ],
            [
                'name' => 'SONY FX6',
                'category' => 'Camera Body',
                'equipment_type' => 'Camera',
                'serial_number' => 'FX6001',
                'status' => 'available',
                'total_quantity' => 1,
                'purchase_date' => '2023-02-20',
                'business_unit' => 'Events',
                'condition' => 'excellent',
                'location' => 'Studio A',
                'image_path' => 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
            ],
            [
                'name' => 'V-MOUNT BATTERY (98WH)',
                'category' => 'Battery',
                'equipment_type' => 'Accessories',
                'serial_number' => 'BATT-VM-98',
                'status' => 'available',
                'total_quantity' => 12,
                'purchase_date' => '2023-03-10',
                'business_unit' => 'Studio',
                'condition' => 'excellent',
                'location' => 'Charging Station',
                'image_path' => 'https://images.unsplash.com/photo-1619133360341-7e3e53669145?w=400&h=300&fit=crop',
            ],
            [
                'name' => 'C-STAND (40")',
                'category' => 'Tripod',
                'equipment_type' => 'Grip',
                'serial_number' => 'GRIP-CS-40',
                'status' => 'available',
                'total_quantity' => 8,
                'purchase_date' => '2023-05-12',
                'business_unit' => 'Studio',
                'condition' => 'excellent',
                'location' => 'Grip Room',
                'image_path' => 'https://images.unsplash.com/photo-1581591524425-c7e0978865fc?w=400&h=300&fit=crop',
            ],
            [
                'name' => 'RODE NTG4+',
                'category' => 'Audio Equipment',
                'equipment_type' => 'Sound',
                'serial_number' => 'NTG4-992',
                'status' => 'available',
                'total_quantity' => 2,
                'purchase_date' => '2024-01-12',
                'business_unit' => 'Studio',
                'condition' => 'excellent',
                'location' => 'Audio Locker',
                'image_path' => 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=300&fit=crop',
            ],
        ];

        foreach ($data as $item) {
            Equipment::create($item);
        }
    }
}
