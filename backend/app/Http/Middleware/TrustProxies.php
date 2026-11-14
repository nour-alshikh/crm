<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies as BaseTrustProxies;

/**
 * Reads trusted proxies from config('app.trusted_proxies') on each request.
 *
 * Calling env() in bootstrap/app.php breaks once `config:cache` runs: .env is
 * no longer loaded, so env() returns null and every proxied request would be
 * attributed to the proxy's IP (one rate-limit bucket for all users).
 */
class TrustProxies extends BaseTrustProxies
{
    /**
     * @return array<int, string>|string|null
     */
    protected function proxies()
    {
        $configured = config('app.trusted_proxies');

        if (! is_string($configured) || trim($configured) === '') {
            return parent::proxies();
        }

        $configured = trim($configured);

        return $configured === '*'
            ? '*'
            : array_values(array_filter(array_map('trim', explode(',', $configured))));
    }
}
