<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\User;
use App\OpenApi\ErrorEnvelope;
use Dedoc\Scramble\Scramble;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $frontendUrl = rtrim(config('cors.allowed_origins')[0] ?? 'http://localhost:3000', '/');

            return "{$frontendUrl}/reset-password?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });

        // General ceiling for the whole API surface (bootstrap/app.php's
        // throttleApi() wires this in as the 'api' middleware group's default).
        // Sensitive endpoints (register/login/forgot-password) additionally
        // carry their own tighter throttle:10,1 on top of this.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Admins bypass every Policy check (see app/Policies) without each
        // policy needing to special-case the admin role individually.
        Gate::before(function (User $user, string $ability) {
            return $user->hasRole('admin') ? true : null;
        });

        // API docs (/docs/api, /docs/api.json): Scramble lets `local` through on
        // its own; staging is open to anyone who can reach it; production only
        // to admins (via the Gate::before bypass above). docs/03-api.md.
        Gate::define('viewApiDocs', fn (?User $user = null): bool => app()->environment('staging'));

        Scramble::configure()->withDocumentTransformers(ErrorEnvelope::class);
    }
}
