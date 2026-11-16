<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A sales/support team. Drives "team" visibility (ADR-004) and lead routing
 * (assignment_rules). Names are a translatable lookup: both locales required.
 *
 * @property int $id
 * @property string $name_ar
 * @property string $name_en
 * @property int|null $manager_id
 */
class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use HasFactory;

    protected $fillable = [
        'name_ar',
        'name_en',
        'manager_id',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * @return HasMany<User, $this>
     */
    public function members(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return HasOne<AssignmentRule, $this>
     */
    public function assignmentRule(): HasOne
    {
        return $this->hasOne(AssignmentRule::class);
    }
}
