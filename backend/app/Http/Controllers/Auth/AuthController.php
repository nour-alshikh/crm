<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    /**
     * Log in (SPA session).
     *
     * Call `GET /sanctum/csrf-cookie` first. Starts a session and sets the
     * `auth_status` marker cookie the frontend proxy checks.
     *
     * @unauthenticated
     */
    public function login(LoginRequest $request): UserResource
    {
        return new UserResource($this->authService->login($request));
    }

    /**
     * Log out: ends the session and clears the marker cookie.
     */
    public function logout(Request $request): Response
    {
        $this->authService->logout($request);

        return response()->noContent();
    }

    /**
     * The signed-in user, with roles and flattened permissions.
     */
    public function user(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
