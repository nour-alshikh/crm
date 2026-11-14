<?php

declare(strict_types=1);

/*
| Architecture rules (docs/07-testing.md → Architecture). More arrive with the
| modules that need them: visibleTo() enforcement (1.3), final Actions,
| FormRequest-only input (first v1 module).
*/

arch('no debugging leftovers')
    ->expect(['dd', 'dump', 'ddd', 'ray', 'var_dump', 'print_r', 'die', 'phpinfo'])
    ->not->toBeUsed();

arch('application code uses strict types')
    ->expect('App')
    ->toUseStrictTypes();

arch('database code uses strict types')
    ->expect('Database')
    ->toUseStrictTypes();

// Arch expectations scan classes (App, Database, Tests), so config/*.php is
// outside their reach by design. bootstrap/ and routes/ aren't classes, so
// they get a plain file scan below. env() returns null once `config:cache`
// runs, so outside config it silently breaks in production.
arch('env() is only called from config files')
    ->expect('env')
    ->not->toBeUsed();

it('does not call env() in bootstrap/ or routes/', function () {
    $root = dirname(__DIR__); // no Laravel app is booted in this file

    $offenders = [];
    foreach (['bootstrap', 'routes'] as $dir) {
        foreach (glob("{$root}/{$dir}/*.php") ?: [] as $file) {
            if (preg_match('/(?<![\w>$:])env\s*\(/', (string) file_get_contents($file)) === 1) {
                $offenders[] = "{$dir}/".basename($file);
            }
        }
    }

    expect($offenders)->toBe([]);
});
