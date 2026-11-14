<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

it('returns 401 with the JSON error envelope for /user when logged out', function () {
    spa()->getJson('/api/v1/user')
        ->assertUnauthorized()
        ->assertExactJson(['message' => __('errors.unauthenticated'), 'code' => 'unauthenticated']);
});

it('returns the current user with roles and permissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    spa()->actingAs($admin)->getJson('/api/v1/user')
        ->assertOk()
        ->assertJsonStructure(['data' => [
            'id', 'name', 'email', 'email_verified_at', 'created_at', 'updated_at',
            'roles', 'permissions', 'avatar_url', 'locale',
        ]])
        ->assertJsonPath('data.id', $admin->id)
        ->assertJsonPath('data.roles', ['admin'])
        ->assertJsonPath('data.permissions', ['manage-users']);
});

it('logs out: session ends, marker cookie cleared, /user is 401 again', function () {
    $user = User::factory()->create(['email' => 'rep@example.com']);
    $user->assignRole('user');

    spa()->postJson('/api/v1/auth/login', ['email' => 'rep@example.com', 'password' => 'password'])->assertOk();
    spa()->getJson('/api/v1/user')->assertOk();

    $logout = spa()->postJson('/api/v1/auth/logout')->assertNoContent();

    // Cookie::forget() queues an already-expired cookie.
    $marker = collect($logout->headers->getCookies())
        ->first(fn ($cookie) => $cookie->getName() === config('session.auth_status_cookie'));
    expect($marker)->not->toBeNull()
        ->and($marker->isCleared())->toBeTrue();

    $this->assertGuest('web');

    // The test app caches resolved guards between requests; a browser would not.
    $this->app['auth']->forgetGuards();
    spa()->getJson('/api/v1/user')->assertUnauthorized();
});

it('requires authentication to log out', function () {
    spa()->postJson('/api/v1/auth/logout')->assertUnauthorized();
});
