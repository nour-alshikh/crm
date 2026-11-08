<?php

namespace App\Http\Resources;

use App\TypeScript\PostType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    /**
     * `title` is a { en, ar } object by default, matching the generated TS
     * type. Pass `?lang=en`/`?lang=ar` to instead get `title` back as the
     * single resolved string for that locale (falls back to the default
     * locale if missing) — see docs/i18n.md.
     */
    public function toArray(Request $request): array
    {
        $data = (array) PostType::fromModel($this->resource);

        if ($lang = $request->query('lang')) {
            $data['title'] = $this->resource->translate('title', $lang);
        }

        return $data;
    }
}
