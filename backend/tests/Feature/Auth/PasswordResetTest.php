<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

beforeEach(function () {
    Notification::fake();
    $this->user = User::factory()->create(['email' => 'rep@example.com']);
});

it('sends a reset link to a registered email', function () {
    spa()->postJson('/api/forgot-password', ['email' => 'rep@example.com'])
        ->assertOk()
        ->assertJsonStructure(['message']);

    Notification::assertSentTo($this->user, ResetPassword::class);
});

it('answers identically for an unknown email and sends nothing (no account enumeration)', function () {
    $known = spa()->postJson('/api/forgot-password', ['email' => 'rep@example.com'])->assertOk();
    $unknown = spa()->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])->assertOk();

    expect($unknown->json())->toBe($known->json());
    Notification::assertSentTimes(ResetPassword::class, 1);
});

it('validates the forgot-password payload', function () {
    spa()->postJson('/api/forgot-password', ['email' => 'nope'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('resets the password with a valid token, and the new password logs in', function () {
    $token = Password::createToken($this->user);

    spa()->postJson('/api/reset-password', [
        'token' => $token,
        'email' => 'rep@example.com',
        'password' => 'new-Secret-123',
        'password_confirmation' => 'new-Secret-123',
    ])->assertOk()->assertJsonStructure(['message']);

    expect(Hash::check('new-Secret-123', $this->user->fresh()->password))->toBeTrue();

    spa()->postJson('/api/login', ['email' => 'rep@example.com', 'password' => 'new-Secret-123'])->assertOk();
});

it('rejects an invalid token without changing the password', function () {
    spa()->postJson('/api/reset-password', [
        'token' => 'not-a-real-token',
        'email' => 'rep@example.com',
        'password' => 'new-Secret-123',
        'password_confirmation' => 'new-Secret-123',
    ])->assertUnprocessable()->assertJsonValidationErrors(['email']);

    expect(Hash::check('password', $this->user->fresh()->password))->toBeTrue();
});

it('validates the reset payload', function () {
    spa()->postJson('/api/reset-password', [
        'email' => 'rep@example.com',
        'password' => 'new-Secret-123',
        'password_confirmation' => 'different',
    ])->assertUnprocessable()->assertJsonValidationErrors(['token', 'password']);
});
