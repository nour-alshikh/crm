<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AssignmentStrategy;
use Database\Factories\AssignmentRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-team lead routing. `last_assigned_user_id` is the round-robin pointer
 * (ADR-026); the assignment service (step 2.4) locks this row while moving it.
 *
 * @property int $id
 * @property int $team_id
 * @property AssignmentStrategy $strategy
 * @property int|null $last_assigned_user_id
 * @property bool $is_active
 */
class AssignmentRule extends Model
{
    /** @use HasFactory<AssignmentRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'team_id',
        'strategy',
        'is_active',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'strategy' => 'round_robin',
        'is_active' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'strategy' => AssignmentStrategy::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function lastAssignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_assigned_user_id');
    }
}
