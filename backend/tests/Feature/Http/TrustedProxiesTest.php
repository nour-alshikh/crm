<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
| TRUSTED_PROXIES must be read through config (app.trusted_proxies), not env()
| at boot: once `config:cache` runs in production, .env is no longer loaded and
| env() returns null, so proxies would be silently untrusted and per-IP rate
| limiting would bucket every user under the proxy's IP.
*/

beforeEach(function () {
    Route::get('/_test/ip', fn (Request $request) => ['ip' => $request->ip()]);
});

function ipBehindProxy(): string
{
    return test()
        ->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])
        ->withHeader('X-Forwarded-For', '203.0.113.9')
        ->getJson('/_test/ip')
        ->assertOk()
        ->json('ip');
}

it('trusts any proxy when app.trusted_proxies is "*"', function () {
    config(['app.trusted_proxies' => '*']);

    expect(ipBehindProxy())->toBe('203.0.113.9');
});

it('trusts only the listed proxies', function () {
    config(['app.trusted_proxies' => '10.0.0.5,10.0.0.6']);
    expect(ipBehindProxy())->toBe('203.0.113.9');

    config(['app.trusted_proxies' => '192.0.2.1']);
    expect(ipBehindProxy())->toBe('10.0.0.5');
});

it('ignores X-Forwarded-For when no proxies are configured', function () {
    config(['app.trusted_proxies' => null]);

    expect(ipBehindProxy())->toBe('10.0.0.5');
});
