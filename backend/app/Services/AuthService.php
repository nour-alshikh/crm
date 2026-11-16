<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(LoginRequest $request): User
    {
        $inactive = false;

        // The callback runs only once the password has been verified, so the
        // "deactivated" message never reveals anything to a wrong password.
        $signedIn = Auth::attemptWhen(
            $request->only('email', 'password'),
            function (User $user) use (&$inactive): bool {
                $inactive = ! $user->is_active;

                return ! $inactive;
            },
            true,
        );

        if (! $signedIn) {
            throw ValidationException::withMessages([
                'email' => $inactive ? __('errors.account_inactive') : __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        $this->queueAuthStatusCookie();

        return Auth::user();
    }

    public function logout(Request $request): void
    {
        Auth::guard('web')->logout();

        // Bearer-token (mobile) requests carry no session.
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        Cookie::queue(Cookie::forget($this->authStatusCookieName()));
    }

    /**
     * Laravel's session cookie is set on every request, authenticated or not,
     * so proxy.ts can't use it to tell "logged in" from "just visited the
     * site" — it needs its own marker cookie that's only ever set here.
     */
    private function queueAuthStatusCookie(): void
    {
        Cookie::queue(Cookie::make(
            $this->authStatusCookieName(),
            '1',
            config('session.lifetime'),
            config('session.path'),
            config('session.domain'),
            config('session.secure'),
            false,
            false,
            config('session.same_site'),
        ));
    }

    private function authStatusCookieName(): string
    {
        return config('session.auth_status_cookie');
    }
}
