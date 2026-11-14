<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException as PermissionUnauthorizedException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Maps any exception raised on the API surface to one JSON shape:
 *
 *   { "message": string, "code": string, "errors"?: { [field]: string[] } }
 *
 * `code` is stable and machine-readable (docs/03-api.md); `message` is
 * translated (lang/{en,ar}/errors.php) and safe to show to users.
 */
class ApiExceptionRenderer
{
    /** HTTP status → `code` for errors that arrive as plain HTTP exceptions. */
    private const STATUS_CODES = [
        401 => 'unauthenticated',
        403 => 'forbidden',
        404 => 'not_found',
        405 => 'method_not_allowed',
        409 => 'conflict',
        419 => 'csrf_mismatch',
        422 => 'validation_failed',
        429 => 'rate_limited',
    ];

    public function render(Throwable $e): JsonResponse
    {
        return match (true) {
            $e instanceof ValidationException => $this->json($e->getMessage(), 'validation_failed', $e->status, [], ['errors' => $e->errors()]),
            $e instanceof DomainException => $this->json($e->getMessage(), $e->errorCode(), $e->status()),
            $e instanceof AuthenticationException => $this->error('unauthenticated', 401),
            $e instanceof AuthorizationException => $this->authorization($e),
            $e instanceof PermissionUnauthorizedException => $this->error('forbidden', 403),
            $e instanceof ModelNotFoundException => $this->error('not_found', 404),
            $e instanceof TokenMismatchException => $this->error('csrf_mismatch', 419),
            $e instanceof ThrottleRequestsException => $this->error('rate_limited', 429, $e->getHeaders()),
            $e instanceof HttpExceptionInterface => $this->http($e),
            default => $this->serverError($e),
        };
    }

    /**
     * A Policy may deny with its own (translated) reason; keep it. Otherwise
     * Laravel's English default is replaced by the translated message.
     */
    private function authorization(AuthorizationException $e): JsonResponse
    {
        $message = $e->getMessage();
        $isDefault = $message === '' || $message === 'This action is unauthorized.';

        return $this->json($isDefault ? $this->t('forbidden') : $message, 'forbidden', 403);
    }

    private function http(HttpExceptionInterface $e): JsonResponse
    {
        $status = $e->getStatusCode();
        $code = self::STATUS_CODES[$status] ?? ($status >= 500 ? 'server_error' : 'http_error');

        // abort(409, '…') carries a specific, intentional explanation; other
        // HTTP exceptions (route not found, method not allowed) carry
        // framework English, so the translated message is used instead.
        $message = $status === 409 && $e->getMessage() !== ''
            ? $e->getMessage()
            : $this->t($code);

        return $this->json($message, $code, $status, $e->getHeaders());
    }

    private function serverError(Throwable $e): JsonResponse
    {
        // Always logged, regardless of APP_DEBUG — that only controls what the
        // *client* sees, not what ends up in storage/logs/laravel.log.
        Log::error($e->getMessage(), ['exception' => $e]);

        if (! config('app.debug')) {
            return $this->error('server_error', 500);
        }

        return $this->json($e->getMessage(), 'server_error', 500, [], [
            'debug' => [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => explode("\n", $e->getTraceAsString()),
            ],
        ]);
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function error(string $code, int $status, array $headers = []): JsonResponse
    {
        return $this->json($this->t($code), $code, $status, $headers);
    }

    /** Translated message for an error code (lang/{en,ar}/errors.php). */
    private function t(string $code): string
    {
        $message = __("errors.{$code}");

        return is_string($message) ? $message : $code;
    }

    /**
     * @param  array<string, string>  $headers
     * @param  array<string, mixed>  $extra
     */
    private function json(string $message, string $code, int $status, array $headers = [], array $extra = []): JsonResponse
    {
        return response()->json(['message' => $message, 'code' => $code, ...$extra], $status, $headers);
    }
}
