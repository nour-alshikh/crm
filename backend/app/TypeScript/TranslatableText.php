<?php

declare(strict_types=1);

namespace App\TypeScript;

use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The object shape a translatable field's raw column value takes, and what
 * a Resource returns by default (see docs/i18n.md). `en` is required at the
 * validation layer; `ar` is optional there, so it's nullable here to match
 * a translation that hasn't been filled in yet.
 */
#[TypeScript]
final class TranslatableText
{
    public function __construct(
        public readonly string $en,
        public readonly ?string $ar,
    ) {}

    /** @param array<string, string> $translations */
    public static function fromArray(array $translations): self
    {
        return new self(
            en: $translations['en'] ?? '',
            ar: $translations['ar'] ?? null,
        );
    }
}
