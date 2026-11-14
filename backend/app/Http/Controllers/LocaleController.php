<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateLocaleRequest;
use App\Http\Resources\UserResource;

class LocaleController extends Controller
{
    public function update(UpdateLocaleRequest $request)
    {
        $user = $request->user();
        $user->update(['locale' => $request->validated('locale')]);

        return response()->json(['user' => new UserResource($user)]);
    }
}
