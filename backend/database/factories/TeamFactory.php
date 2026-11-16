<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Team>
 */
class TeamFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name_ar' => 'فريق '.$name,
            'name_en' => ucfirst($name).' team',
            'manager_id' => null,
        ];
    }

    /**
     * Set the manager and make them a member of the team as well.
     */
    public function managedBy(User $manager): static
    {
        return $this->state(['manager_id' => $manager->id])
            ->afterCreating(function (Team $team) use ($manager): void {
                $manager->forceFill(['team_id' => $team->id])->save();
            });
    }

    /**
     * Give the team its assignment rule (round-robin, active).
     */
    public function withAssignmentRule(): static
    {
        return $this->has(AssignmentRuleFactory::new(), 'assignmentRule');
    }
}
