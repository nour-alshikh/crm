<?php

namespace App\Enums;

enum PostCategory: string
{
    case General = 'general';
    case Tutorial = 'tutorial';
    case News = 'news';
    case Opinion = 'opinion';
}
