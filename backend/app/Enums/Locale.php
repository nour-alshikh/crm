<?php

declare(strict_types=1);

namespace App\Enums;

enum Locale: string
{
    case En = 'en';
    case Ar = 'ar';

    public function isRtl(): bool
    {
        return $this === self::Ar;
    }
}
