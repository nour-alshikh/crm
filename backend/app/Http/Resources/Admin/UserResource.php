<?php

namespace App\Http\Resources\Admin;

use App\TypeScript\AdminUserType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return (array) AdminUserType::fromModel($this->resource);
    }
}
