<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    public function admin(): static
    {
        return $this->withRole('admin');
    }

    public function manager(): static
    {
        return $this->withRole('manager');
    }

    public function rep(): static
    {
        return $this->withRole('rep');
    }

    public function support(): static
    {
        return $this->withRole('support');
    }

    /**
     * Put the user in a team (a new one unless given).
     */
    public function inTeam(?Team $team = null): static
    {
        return $this->state(fn () => ['team_id' => $team->id ?? Team::factory()]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }

    public function away(): static
    {
        return $this->state(['is_away' => true]);
    }

    /**
     * Assign a role after creation. The role is created if missing, so tests
     * don't depend on RolePermissionSeeder (whose role catalogue lands in 1.2).
     */
    private function withRole(string $role): static
    {
        return $this->afterCreating(function (User $user) use ($role): void {
            $user->assignRole(Role::findOrCreate($role, 'web'));
        });
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
