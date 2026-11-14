<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AvatarController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:5120'],
        ]);

        $user = $request->user();

        $user->addMediaFromRequest('avatar')
            ->toMediaCollection('avatar');

        return response()->json([
            'avatar_url' => $user->fresh()->getFirstMediaUrl('avatar', 'thumb'),
        ]);
    }

    public function destroy(Request $request)
    {
        $request->user()->clearMediaCollection('avatar');

        return response()->noContent();
    }
}
