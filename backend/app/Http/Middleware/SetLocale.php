<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\Locale;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the request locale — `?lang=`, then the authenticated user's
 * saved preference, then the `Accept-Language` header, then config default
 * — and applies it via App::setLocale() so validation messages (and
 * anything else that reads the app locale) come back translated.
 * See docs/i18n.md.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->query('lang')
            ?? $request->user()?->locale
            ?? $this->fromAcceptLanguage($request);

        if ($locale && Locale::tryFrom($locale)) {
            app()->setLocale($locale);
        }

        return $next($request);
    }

    private function fromAcceptLanguage(Request $request): ?string
    {
        $header = $request->header('Accept-Language');

        return $header ? strtolower(substr($header, 0, 2)) : null;
    }
}
