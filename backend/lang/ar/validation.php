<?php

declare(strict_types=1);

// Only overrides attribute names. Everything else (rule phrasing like
// "required", "max") isn't translated here and falls back to Laravel's
// English default automatically — see docs/i18n.md for why this is a
// deliberate scope cut, not an oversight.
return [
    'attributes' => [
        'title.en' => 'العنوان (بالإنجليزية)',
        'title.ar' => 'العنوان (بالعربية)',
        'body' => 'المحتوى',
        'locale' => 'اللغة',
    ],
];
