<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\TypeScript\UserType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return (array) UserType::fromModel($this->resource);
    }
}
