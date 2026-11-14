<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->user = User::factory()->create(['email' => 'rep@example.com']);
    $this->user->assignRole('user');
});

it('logs in with valid credentials and returns the user', function () {
    spa()->postJson('/api/login', ['email' => 'rep@example.com', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('user.id', $this->user->id)
        ->assertJsonPath('user.email', 'rep@example.com')
        ->assertJsonPath('user.roles', ['admin'])
        // proxy.ts / auth-context only check the marker's presence, not its value.
        ->assertCookie(config('session.auth_status_cookie'));

    $this->assertAuthenticatedAs($this->user, 'web');
});

it('rejects a wrong password with a 422 on email', function () {
    spa()->postJson('/api/login', ['email' => 'rep@example.com', 'password' => 'wrong-password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertCookieMissing(config('session.auth_status_cookie'));

    $this->assertGuest('web');
});

it('rejects an unknown email the same way as a wrong password', function () {
    $unknown = spa()->postJson('/api/login', ['email' => 'nobody@example.com', 'password' => 'password'])
        ->assertUnprocessable();

    $wrongPassword = spa()->postJson('/api/login', ['email' => 'rep@example.com', 'password' => 'nope'])
        ->assertUnprocessable();

    expect($unknown->json('errors.email'))->toBe($wrongPassword->json('errors.email'));
});

it('validates the login payload', function (array $payload, array $errors) {
    spa()->postJson('/api/login', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($errors)
        ->assertJsonStructure(['message', 'errors']);
})->with([
    'empty' => [[], ['email', 'password']],
    'bad email' => [['email' => 'not-an-email', 'password' => 'x'], ['email']],
    'missing password' => [['email' => 'rep@example.com'], ['password']],
]);

it('throttles login after 10 attempts per minute', function () {
    foreach (range(1, 10) as $_) {
        spa()->postJson('/api/login', ['email' => 'rep@example.com', 'password' => 'wrong'])
            ->assertUnprocessable();
    }

    spa()->postJson('/api/login', ['email' => 'rep@example.com', 'password' => 'password'])
        ->assertTooManyRequests()
        ->assertJson(['message' => 'Too many requests.'])
        ->assertHeader('Retry-After');
});
