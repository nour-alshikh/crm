<?php

declare(strict_types=1);

use App\Exceptions\DomainException;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Route;

/*
| Every API error is { message, code, errors? } (docs/03-api.md). Test-only
| routes live under /api/v1/_test so they go through the API error renderer.
*/

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    Route::get('/api/v1/_test/conflict', fn () => abort(409, 'Stale lock_version.'));
    Route::get('/api/v1/_test/conflict-default', fn () => abort(409));
    Route::get('/api/v1/_test/domain', function () {
        throw new class('A lost deal needs a lost reason.') extends DomainException {};
    });
    Route::get('/api/v1/_test/boom', fn () => throw new RuntimeException('secret internals'));
});

function rep(): User
{
    $user = User::factory()->create();
    $user->assignRole('user');

    return $user;
}

it('returns 401 unauthenticated', function () {
    $this->getJson('/api/v1/user')
        ->assertUnauthorized()
        ->assertExactJson(['message' => __('errors.unauthenticated'), 'code' => 'unauthenticated']);
});

it('returns 403 forbidden for a missing permission', function () {
    $this->actingAs(rep())->getJson('/api/v1/admin/users')
        ->assertForbidden()
        ->assertExactJson(['message' => __('errors.forbidden'), 'code' => 'forbidden']);
});

it('returns 403 forbidden when a policy denies', function () {
    $post = rep()->posts()->create([
        'title' => ['en' => 'Owned by someone else'],
        'body' => 'Body',
        'status' => 'draft',
        'category' => 'general',
    ]);

    $this->actingAs(rep())->deleteJson("/api/v1/posts/{$post->id}")
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');
});

it('returns 404 not_found for unknown routes and missing models', function () {
    $this->getJson('/api/v1/does-not-exist')
        ->assertNotFound()
        ->assertExactJson(['message' => __('errors.not_found'), 'code' => 'not_found']);

    $this->actingAs(rep())->deleteJson('/api/v1/posts/999999')
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');
});

it('returns 405 method_not_allowed', function () {
    $this->getJson('/api/v1/auth/login')
        ->assertStatus(405)
        ->assertJsonPath('code', 'method_not_allowed');
});

it('returns 422 validation_failed with field errors', function () {
    spa()->postJson('/api/v1/auth/login', [])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonStructure(['message', 'code', 'errors' => ['email', 'password']]);
});

it('returns 422 domain_error for business-rule violations', function () {
    $this->getJson('/api/v1/_test/domain')
        ->assertUnprocessable()
        ->assertExactJson(['message' => 'A lost deal needs a lost reason.', 'code' => 'domain_error']);
});

it('returns 409 conflict, keeping an explicit message', function () {
    $this->getJson('/api/v1/_test/conflict')
        ->assertConflict()
        ->assertExactJson(['message' => 'Stale lock_version.', 'code' => 'conflict']);

    $this->getJson('/api/v1/_test/conflict-default')
        ->assertConflict()
        ->assertExactJson(['message' => __('errors.conflict'), 'code' => 'conflict']);
});

it('returns 429 rate_limited with Retry-After', function () {
    foreach (range(1, 10) as $_) {
        spa()->postJson('/api/v1/auth/forgot-password', ['email' => 'x@example.com']);
    }

    spa()->postJson('/api/v1/auth/forgot-password', ['email' => 'x@example.com'])
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'rate_limited')
        ->assertHeader('Retry-After');
});

it('returns 500 server_error without internals when debug is off', function () {
    config(['app.debug' => false]);

    $this->getJson('/api/v1/_test/boom')
        ->assertServerError()
        ->assertExactJson(['message' => __('errors.server_error'), 'code' => 'server_error']);
});

it('adds a debug block to 500s only when debug is on', function () {
    config(['app.debug' => true]);

    $this->getJson('/api/v1/_test/boom')
        ->assertServerError()
        ->assertJsonPath('code', 'server_error')
        ->assertJsonPath('message', 'secret internals')
        ->assertJsonPath('debug.exception', RuntimeException::class);
});

it('translates messages to Arabic via Accept-Language', function () {
    $this->withHeader('Accept-Language', 'ar')
        ->getJson('/api/v1/user')
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'لم تقم بتسجيل الدخول.', 'code' => 'unauthenticated']);
});

it('has no registration endpoint (internal app; admins create users)', function (string $method, string $uri) {
    spa()->json($method, $uri, ['name' => 'X', 'email' => 'x@example.com', 'password' => 'secret-123', 'password_confirmation' => 'secret-123'])
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found');

    $this->assertDatabaseMissing('users', ['email' => 'x@example.com']);
})->with([
    'v1' => ['POST', '/api/v1/register'],
    'v1 auth' => ['POST', '/api/v1/auth/register'],
    'legacy unversioned' => ['POST', '/api/register'],
]);

it('no longer serves the unversioned API', function () {
    $this->getJson('/api/user')->assertNotFound();
    spa()->postJson('/api/login', ['email' => 'a@b.c', 'password' => 'x'])->assertNotFound();
});
