<?php

declare(strict_types=1);

namespace App\OpenApi;

use Dedoc\Scramble\Configuration\OperationTransformers;
use Dedoc\Scramble\Configuration\SecurityDocumentationContext;
use Dedoc\Scramble\Contracts\SecurityDocumentationStrategy;
use Dedoc\Scramble\GeneratorConfig;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Dedoc\Scramble\Support\RouteInfo;
use Illuminate\Routing\Route;
use Illuminate\Support\Str;

/**
 * Documents Sanctum's two ways in (ADR-003): the SPA session cookie (web, via
 * /sanctum/csrf-cookie + X-XSRF-TOKEN) and personal access tokens (mobile,
 * `Authorization: Bearer`). Either satisfies `auth:sanctum`; routes without
 * auth middleware are marked public. Referenced by class name from
 * config/scramble.php so `config:cache` keeps working.
 */
final class SanctumSecurityStrategy implements SecurityDocumentationStrategy
{
    private const AUTH_MIDDLEWARE = ['auth', 'auth:*'];

    public function configure(SecurityDocumentationContext $context): GeneratorConfig
    {
        return $context->config
            ->withDocumentTransformers(function (OpenApi $openApi): void {
                $openApi->secure(
                    SecurityScheme::apiKey('cookie', (string) config('session.cookie'))
                        ->as('session')
                        ->setDescription('SPA session cookie. Call GET /sanctum/csrf-cookie first and send the XSRF-TOKEN cookie back as the X-XSRF-TOKEN header on writes.'),
                );
                $openApi->secure(
                    SecurityScheme::http('bearer')
                        ->as('token')
                        ->setDescription('Sanctum personal access token (mobile app).'),
                );
            })
            ->withOperationTransformers(function (OperationTransformers $transformers): void {
                $transformers->prepend(function (Operation $operation, RouteInfo $routeInfo): void {
                    if (! $this->requiresAuth($routeInfo->route)) {
                        $operation->security = [];
                    }
                });
            });
    }

    private function requiresAuth(Route $route): bool
    {
        return collect($route->gatherMiddleware())
            ->contains(fn (mixed $middleware): bool => is_string($middleware) && Str::is(self::AUTH_MIDDLEWARE, $middleware));
    }
}
