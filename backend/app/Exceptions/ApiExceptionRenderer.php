<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException as PermissionUnauthorizedException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Maps any exception raised on the API surface to one consistent JSON shape:
 *
 *   { "message": string, "errors"?: { [field]: string[] } }
 *
 * so frontend error handling (ApiError in frontend/src/lib/api.ts) can rely on
 * `message` and optionally `errors` always being there, regardless of which
 * layer actually threw.
 */
class ApiExceptionRenderer
{
    public function render(Throwable $e): JsonResponse
    {
        return match (true) {
            $e instanceof ValidationException => $this->validation($e),
            $e instanceof AuthenticationException => $this->json('Unauthenticated.', 401),
            $e instanceof AuthorizationException => $this->json($e->getMessage() ?: 'This action is unauthorized.', 403),
            $e instanceof PermissionUnauthorizedException => $this->json($e->getMessage(), 403),
            $e instanceof ModelNotFoundException => $this->json('Resource not found.', 404),
            $e instanceof NotFoundHttpException => $this->json('Resource not found.', 404),
            $e instanceof ThrottleRequestsException => $this->json('Too many requests.', 429, $e->getHeaders()),
            $e instanceof HttpExceptionInterface => $this->json($e->getMessage() ?: 'Request failed.', $e->getStatusCode(), $e->getHeaders()),
            default => $this->serverError($e),
        };
    }

    private function validation(ValidationException $e): JsonResponse
    {
        return $this->json($e->getMessage(), $e->status, [], ['errors' => $e->errors()]);
    }

    private function serverError(Throwable $e): JsonResponse
    {
        // Always logged, regardless of APP_DEBUG — that only controls what the
        // *client* sees, not what ends up in storage/logs/laravel.log.
        Log::error($e->getMessage(), ['exception' => $e]);

        if (! config('app.debug')) {
            return $this->json('Server error.', 500);
        }

        return $this->json($e->getMessage(), 500, [], [
            'debug' => [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => explode("\n", $e->getTraceAsString()),
            ],
        ]);
    }

    private function json(string $message, int $status, array $headers = [], array $extra = []): JsonResponse
    {
        return response()->json(['message' => $message, ...$extra], $status, $headers);
    }
}
