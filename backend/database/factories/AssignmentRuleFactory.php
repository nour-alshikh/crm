<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AssignmentStrategy;
use App\Models\AssignmentRule;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AssignmentRule>
 */
class AssignmentRuleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'strategy' => AssignmentStrategy::RoundRobin,
            'is_active' => true,
        ];
    }

    public function manual(): static
    {
        return $this->state(['strategy' => AssignmentStrategy::Manual]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
