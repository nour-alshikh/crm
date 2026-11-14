<?php

declare(strict_types=1);

namespace App\OpenApi;

use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Response;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\Generator\Types\StringType;

/**
 * Adds the `code` field of our error envelope (App\Exceptions\ApiExceptionRenderer)
 * to every error response Scramble documents, so generated clients get a
 * typed `ApiErrorCode` union instead of only `{message}`.
 */
final class ErrorEnvelope
{
    /** Every `code` the API can return — keep in sync with docs/03-api.md. */
    public const CODES = [
        'unauthenticated',
        'forbidden',
        'not_found',
        'method_not_allowed',
        'conflict',
        'csrf_mismatch',
        'validation_failed',
        'domain_error',
        'rate_limited',
        'http_error',
        'server_error',
    ];

    public function __invoke(OpenApi $openApi): void
    {
        $codeRef = $openApi->components->addSchema(
            'ApiErrorCode',
            Schema::fromType(
                (new StringType)
                    ->enum(self::CODES)
                    ->setDescription('Stable, machine-readable error code (docs/03-api.md).'),
            ),
        );

        foreach ($openApi->components->responses as $response) {
            if (! $response instanceof Response || ! isset($response->content['application/json'])) {
                continue;
            }

            $schema = $response->getContent('application/json');

            if ($schema instanceof Schema && $schema->type instanceof ObjectType) {
                $schema->type->addProperty('code', $codeRef);
                $schema->type->addRequired(['code']);
            }
        }
    }
}
