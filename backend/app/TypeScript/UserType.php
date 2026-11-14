<?php

declare(strict_types=1);

namespace App\TypeScript;

use App\Models\User;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class UserType
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $email,
        public readonly ?string $email_verified_at,
        public readonly string $created_at,
        public readonly string $updated_at,
        /** @var string[] */
        public readonly array $roles,
        /** @var string[] */
        public readonly array $permissions,
        public readonly ?string $avatar_url,
        public readonly ?string $locale,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
            email_verified_at: $user->email_verified_at?->toJSON(),
            created_at: $user->created_at->toJSON(),
            updated_at: $user->updated_at->toJSON(),
            roles: $user->getRoleNames()->all(),
            permissions: $user->getAllPermissions()->pluck('name')->all(),
            avatar_url: $user->getFirstMediaUrl('avatar', 'thumb') ?: null,
            locale: $user->locale,
        );
    }
}
