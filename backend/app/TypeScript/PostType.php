<?php

namespace App\TypeScript;

use App\Enums\PostCategory;
use App\Enums\PostStatus;
use App\Enums\PostTag;
use App\Models\Post;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class PostType
{
    public function __construct(
        public readonly int $id,
        public readonly TranslatableText $title,
        public readonly string $body,
        public readonly PostStatus $status,
        public readonly PostCategory $category,
        /** @var PostTag[] */
        public readonly array $tags,
        public readonly bool $is_featured,
        public readonly ?int $reading_minutes,
        public readonly int $priority,
        public readonly ?string $published_at,
        public readonly PostAuthorType $user,
        public readonly string $created_at,
        public readonly string $updated_at,
    ) {}

    public static function fromModel(Post $post): self
    {
        return new self(
            id: $post->id,
            title: TranslatableText::fromArray($post->title ?? []),
            body: $post->body,
            status: $post->status,
            category: $post->category,
            tags: array_map(fn (string $tag) => PostTag::from($tag), $post->tags ?? []),
            is_featured: $post->is_featured,
            reading_minutes: $post->reading_minutes,
            priority: $post->priority,
            published_at: $post->published_at?->toDateString(),
            user: PostAuthorType::fromModel($post->user),
            created_at: $post->created_at->toJSON(),
            updated_at: $post->updated_at->toJSON(),
        );
    }
}
