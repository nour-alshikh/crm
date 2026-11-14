<?php

declare(strict_types=1);

// Messages for the API error envelope (App\Exceptions\ApiExceptionRenderer).
return [
    'unauthenticated' => 'You are not signed in.',
    'forbidden' => 'You do not have permission to do this.',
    'not_found' => 'The requested resource was not found.',
    'conflict' => 'This record was changed by someone else. Reload and try again.',
    'csrf_mismatch' => 'Your session expired. Reload the page and try again.',
    'rate_limited' => 'Too many requests. Please wait a moment and try again.',
    'method_not_allowed' => 'This action is not supported.',
    'http_error' => 'The request could not be completed.',
    'server_error' => 'Something went wrong on our side. Please try again.',
];
