<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\AuthService;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deactivation takes effect on the very next request (docs/06-security.md):
 * a deactivated user's session is ended and all their API tokens are revoked.
 *
 * Laravel's middleware priority runs `auth:sanctum` before this group
 * middleware, so authenticated routes get an explicit 401 `unauthenticated`
 * here. Public routes (login, password reset) carry on, so a browser that
 * still held the stale session can sign in as someone else.
 */
class EnsureUserIsActive
{
    public function __construct(private readonly AuthService $authService) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('sanctum')->user();

        if ($user instanceof User && ! $user->is_active) {
            $user->tokens()->delete();
            $this->authService->logout($request);

            // Guards cache the resolved user for the rest of the request.
            Auth::forgetGuards();

            if ($this->requiresAuthentication($request)) {
                throw new AuthenticationException;
            }
        }

        return $next($request);
    }

    private function requiresAuthentication(Request $request): bool
    {
        return collect($request->route()?->gatherMiddleware() ?? [])
            ->contains(fn (mixed $middleware): bool => is_string($middleware) && Str::startsWith($middleware, 'auth'));
    }
}
