<?php

declare(strict_types=1);

namespace App\Enums;

enum PostTag: string
{
    case Laravel = 'laravel';
    case Nextjs = 'nextjs';
    case Typescript = 'typescript';
    case React = 'react';
    case Php = 'php';
    case Testing = 'testing';
}
