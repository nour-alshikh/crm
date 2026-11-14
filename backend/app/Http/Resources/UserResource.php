<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The signed-in user (auth responses, GET /user). Replaced by MeResource in 1.2.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
            /** @var list<string> */
            'roles' => $this->getRoleNames()->values()->all(),
            /** @var list<string> */
            'permissions' => $this->getAllPermissions()->pluck('name')->values()->all(),
            'avatar_url' => $this->getFirstMediaUrl('avatar', 'thumb') ?: null,
            /** @var 'en'|'ar'|null */
            'locale' => $this->locale,
        ];
    }
}
