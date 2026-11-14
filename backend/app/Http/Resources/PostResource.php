<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\PostTag;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * `title` is a { en, ar } object by default. Pass `?lang=en|ar` to get it back
 * as the single resolved string for that locale instead (falls back to the
 * default locale) — see docs/i18n.md.
 *
 * @mixin Post
 */
class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lang = $request->query('lang');

        return [
            'id' => $this->id,
            /** @var array{en: string, ar: string|null}|string */
            'title' => is_string($lang)
                ? $this->translate('title', $lang)
                : ['en' => $this->title['en'] ?? '', 'ar' => $this->title['ar'] ?? null],
            'body' => $this->body,
            'status' => $this->status,
            'category' => $this->category,
            /** @var list<PostTag> */
            'tags' => array_map(fn (string $tag) => PostTag::from($tag), $this->tags ?? []),
            'is_featured' => $this->is_featured,
            'reading_minutes' => $this->reading_minutes,
            'priority' => $this->priority,
            'published_at' => $this->published_at?->toDateString(),
            'user' => ['id' => $this->user->id, 'name' => $this->user->name],
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
