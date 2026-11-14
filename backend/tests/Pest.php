<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
| Feature tests boot Laravel and run against the MySQL `testing` database
| (phpunit.xml), wrapped in a transaction per test. Unit tests stay
| framework-free (plain PHPUnit TestCase) unless they opt in.
*/
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/**
 * The SPA's origin. Sanctum only starts a session (cookies, CSRF, login) for
 * requests whose Origin/Referer is in `sanctum.stateful`; phpunit.xml pins
 * SANCTUM_STATEFUL_DOMAINS to this host so tests don't depend on .env.
 */
const SPA_ORIGIN = 'http://localhost:3000';

/**
 * Make the next request(s) look like they come from the Next.js frontend.
 */
function spa(): TestCase
{
    return test()->withHeaders([
        'Origin' => SPA_ORIGIN,
        'Referer' => SPA_ORIGIN.'/',
    ]);
}
