<?php

namespace App\Support;

/**
 * Applies to a model whose $casts marks one or more columns as 'array',
 * storing translations as { "en": "...", "ar": "..." } — see docs/i18n.md.
 */
trait HasTranslations
{
    public function translate(string $field, ?string $locale = null): ?string
    {
        $translations = $this->getAttribute($field) ?? [];
        $locale ??= app()->getLocale();
        $fallback = config('app.fallback_locale');

        return $translations[$locale] ?? $translations[$fallback] ?? null;
    }
}
