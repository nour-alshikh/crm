<?php

declare(strict_types=1);

it('serves the health check', function () {
    $this->get('/up')->assertOk();
});
