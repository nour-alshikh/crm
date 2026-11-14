<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $manageUsers = Permission::firstOrCreate(['name' => 'manage-users']);

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->givePermissionTo($manageUsers);

        Role::firstOrCreate(['name' => 'user']);
    }
}
