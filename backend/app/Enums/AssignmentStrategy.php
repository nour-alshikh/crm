<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How new leads routed to a team are given an owner (assignment_rules.strategy).
 */
enum AssignmentStrategy: string
{
    /** Next eligible member after `last_assigned_user_id` (ADR-026). */
    case RoundRobin = 'round_robin';

    /** Leads stay unassigned in the team until a manager assigns them. */
    case Manual = 'manual';
}
