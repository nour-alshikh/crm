<?php

declare(strict_types=1);

use App\Enums\AssignmentStrategy;
use App\Models\AssignmentRule;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

it('stores the CRM user columns with their defaults', function () {
    $user = User::factory()->create()->refresh();

    expect($user->is_active)->toBeTrue()
        ->and($user->receives_leads)->toBeTrue()
        ->and($user->is_away)->toBeFalse()
        ->and($user->team_id)->toBeNull()
        ->and($user->preferences)->toBeNull()
        ->and($user->last_seen_at)->toBeNull();
});

it('casts preferences to an array', function () {
    $user = User::factory()->create(['preferences' => ['density' => 'compact']]);

    expect($user->refresh()->preferences)->toBe(['density' => 'compact']);
});

it('does not mass-assign admin-controlled flags', function () {
    $user = new User(['name' => 'X', 'is_active' => false, 'team_id' => 5, 'receives_leads' => false, 'is_away' => true]);

    expect($user->is_active)->toBeTrue()
        ->and($user->team_id)->toBeNull()
        ->and($user->receives_leads)->toBeTrue()
        ->and($user->is_away)->toBeFalse();
});

it('scopes active users', function () {
    $active = User::factory()->create();
    User::factory()->inactive()->create();

    expect(User::active()->pluck('id')->all())->toBe([$active->id]);
});

it('links teams, members, manager and assignment rule', function () {
    $manager = User::factory()->manager()->create();
    $team = Team::factory()->managedBy($manager)->withAssignmentRule()->create();
    $rep = User::factory()->rep()->inTeam($team)->create();

    expect($team->manager->is($manager))->toBeTrue()
        ->and($team->members->pluck('id')->sort()->values()->all())->toBe([$manager->id, $rep->id])
        ->and($rep->team->is($team))->toBeTrue()
        ->and($manager->managedTeams->pluck('id')->all())->toBe([$team->id])
        ->and($team->assignmentRule->strategy)->toBe(AssignmentStrategy::RoundRobin)
        ->and($team->assignmentRule->is_active)->toBeTrue();
});

it('allows one assignment rule per team', function () {
    $rule = AssignmentRule::factory()->create();

    AssignmentRule::factory()->create(['team_id' => $rule->team_id]);
})->throws(UniqueConstraintViolationException::class);

it('keeps the pointer and members when users or teams go away', function () {
    $team = Team::factory()->create();
    $rep = User::factory()->inTeam($team)->create();
    $rule = AssignmentRule::factory()->manual()->create(['team_id' => $team->id]);
    $rule->forceFill(['last_assigned_user_id' => $rep->id])->save();

    $rep->delete();
    expect($rule->refresh()->last_assigned_user_id)->toBeNull()
        ->and($rule->strategy)->toBe(AssignmentStrategy::Manual);

    $member = User::factory()->inTeam($team)->create();
    $team->delete();
    expect($member->refresh()->team_id)->toBeNull()
        ->and(AssignmentRule::count())->toBe(0);
});

it('provides role factory states', function (string $state, string $role) {
    $user = User::factory()->{$state}()->create();

    expect($user->getRoleNames()->all())->toBe([$role]);
})->with([
    ['admin', 'admin'],
    ['manager', 'manager'],
    ['rep', 'rep'],
    ['support', 'support'],
]);

it('provides team and availability factory states', function () {
    $team = Team::factory()->create();

    expect(User::factory()->inTeam($team)->create()->team_id)->toBe($team->id)
        ->and(User::factory()->inTeam()->create()->team_id)->not->toBeNull()
        ->and(User::factory()->away()->create()->is_away)->toBeTrue()
        ->and(User::factory()->inactive()->create()->is_active)->toBeFalse();
});
