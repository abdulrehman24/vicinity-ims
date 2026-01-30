<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'is_admin' => 2,
                'is_approved' => 1,
            ]
        );

        User::updateOrCreate(
            ['email' => 'kevin@vicinity.studio'],
            [
                'name' => 'Super Admin User',
                'password' => Hash::make('vicinity123#'),
                'is_admin' => 2,
                'is_approved' => 1,
            ]
        );
    }
}
