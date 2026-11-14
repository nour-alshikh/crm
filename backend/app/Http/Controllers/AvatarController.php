<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AvatarController extends Controller
{
    /**
     * Upload (replace) the signed-in user's avatar; returns the updated user.
     */
    public function store(Request $request): UserResource
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:5120'],
        ]);

        $user = $request->user();

        $user->addMediaFromRequest('avatar')
            ->toMediaCollection('avatar');

        return new UserResource($user->fresh());
    }

    public function destroy(Request $request): Response
    {
        $request->user()->clearMediaCollection('avatar');

        return response()->noContent();
    }
}
