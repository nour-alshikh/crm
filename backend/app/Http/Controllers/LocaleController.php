<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateLocaleRequest;
use App\Http\Resources\UserResource;

class LocaleController extends Controller
{
    /**
     * Save the signed-in user's UI language; returns the updated user.
     */
    public function update(UpdateLocaleRequest $request): UserResource
    {
        $user = $request->user();

        $user->update(['locale' => $request->validated('locale')]);

        return new UserResource($user);
    }
}
