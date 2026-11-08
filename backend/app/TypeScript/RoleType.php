<?php

namespace App\TypeScript;

use Spatie\Permission\Models\Role;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class RoleType
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
    ) {}

    public static function fromModel(Role $role): self
    {
        return new self(id: $role->id, name: $role->name);
    }
}
