<?php

namespace App\Services;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function register(RegisterRequest $request): User
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole('user');

        Auth::login($user);

        $request->session()->regenerate();

        $this->queueAuthStatusCookie();

        return $user;
    }

    public function login(LoginRequest $request): User
    {
        if (! Auth::attempt($request->only('email', 'password'), true)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        $this->queueAuthStatusCookie();

        return Auth::user();
    }

    public function logout(Request $request): void
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

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
