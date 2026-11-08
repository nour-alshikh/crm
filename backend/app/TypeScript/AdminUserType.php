<?php

namespace App\TypeScript;

use App\Models\User;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class AdminUserType
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $email,
        /** @var RoleType[] */
        public readonly array $roles,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
            roles: $user->roles->map(fn ($role) => RoleType::fromModel($role))->all(),
        );
    }
}
