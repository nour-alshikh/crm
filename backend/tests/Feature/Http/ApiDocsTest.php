<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

/*
| /docs/api (UI) and /docs/api.json (spec): local and staging are open,
| production only for admins (docs/03-api.md). Tests run in `testing`, which
| behaves like production here.
*/

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

it('hides the API docs from guests and non-admins outside local/staging', function () {
    $this->get('/docs/api.json')->assertForbidden();

    $rep = User::factory()->create();
    $rep->assignRole('user');
    $this->actingAs($rep)->get('/docs/api.json')->assertForbidden();
});

it('serves the spec to admins, listing the v1 endpoints', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $spec = $this->actingAs($admin)->get('/docs/api.json')->assertOk()->json();

    expect($spec['paths'])->toHaveKeys(['/auth/login', '/auth/logout', '/user', '/posts'])
        ->and($spec['paths'])->not->toHaveKey('/register')
        ->and($spec['components']['schemas'])->toHaveKey('ApiErrorCode')
        ->and($spec['components']['securitySchemes'])->toHaveKeys(['session', 'token']);
});

it('opens the docs to anyone on staging', function () {
    $this->app['env'] = 'staging';

    $this->get('/docs/api.json')->assertOk();
});
