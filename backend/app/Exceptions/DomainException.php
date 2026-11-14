<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Base for business-rule violations ("a lost deal needs a lost reason").
 * Rendered as 422 `{message, code: "domain_error"}` by ApiExceptionRenderer.
 *
 * Throw a subclass per rule with an already-translated message, e.g.
 *   throw new LostReasonRequired(__('deals.lost_reason_required'));
 * Never return ad-hoc error arrays from controllers (CLAUDE.md).
 */
abstract class DomainException extends RuntimeException
{
    public function status(): int
    {
        return 422;
    }

    public function errorCode(): string
    {
        return 'domain_error';
    }
}
