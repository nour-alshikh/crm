<?php

declare(strict_types=1);

use App\Models\User;

/*
| docs/06-security.md: deactivated users are rejected on every request, their
| session is ended and their tokens revoked.
*/

it('rejects a deactivated user on the next request and ends the session', function () {
    $user = User::factory()->create(['email' => 'rep@example.com']);

    spa()->postJson('/api/v1/auth/login', ['email' => 'rep@example.com', 'password' => 'password'])->assertOk();
    spa()->getJson('/api/v1/user')->assertOk();

    $user->forceFill(['is_active' => false])->save();
    $this->app['auth']->forgetGuards();

    $response = spa()->getJson('/api/v1/user')
        ->assertUnauthorized()
        ->assertExactJson(['message' => __('errors.unauthenticated'), 'code' => 'unauthenticated']);

    $marker = collect($response->headers->getCookies())
        ->first(fn ($cookie) => $cookie->getName() === config('session.auth_status_cookie'));
    expect($marker)->not->toBeNull()
        ->and($marker->isCleared())->toBeTrue();

    // Reactivating does not resurrect the killed session.
    $user->forceFill(['is_active' => true])->save();
    $this->app['auth']->forgetGuards();
    spa()->getJson('/api/v1/user')->assertUnauthorized();
});

it('revokes the API tokens of a deactivated user', function () {
    $user = User::factory()->inactive()->create();
    $token = $user->createToken('mobile')->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/user')->assertUnauthorized();

    expect($user->tokens()->count())->toBe(0);
});

it('still serves public routes to a browser holding a deactivated session', function () {
    User::factory()->create(['email' => 'old@example.com', 'is_active' => false]);
    $other = User::factory()->create(['email' => 'new@example.com']);

    spa()->actingAs(User::whereEmail('old@example.com')->firstOrFail());

    spa()->postJson('/api/v1/auth/login', ['email' => 'new@example.com', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.id', $other->id);
});

it('refuses to sign in a deactivated user with a specific message', function () {
    User::factory()->inactive()->create(['email' => 'rep@example.com']);

    spa()->postJson('/api/v1/auth/login', ['email' => 'rep@example.com', 'password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonPath('errors.email.0', __('errors.account_inactive'));

    $this->assertGuest('web');
});

it('gives the generic message for a wrong password, even on a deactivated account', function () {
    User::factory()->inactive()->create(['email' => 'rep@example.com']);

    spa()->postJson('/api/v1/auth/login', ['email' => 'rep@example.com', 'password' => 'wrong'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', __('auth.failed'));
});
