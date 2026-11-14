<?php

declare(strict_types=1);

namespace App\Enums;

enum PostCategory: string
{
    case General = 'general';
    case Tutorial = 'tutorial';
    case News = 'news';
    case Opinion = 'opinion';
}
