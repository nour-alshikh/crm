<?php

declare(strict_types=1);

namespace App\Http\Requests\Post;

use App\Enums\PostCategory;
use App\Enums\PostStatus;
use App\Enums\PostTag;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'array'],
            'title.en' => ['required_with:title', 'string', 'max:255'],
            'title.ar' => ['nullable', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'status' => ['sometimes', new Enum(PostStatus::class)],
            'category' => ['sometimes', new Enum(PostCategory::class)],
            'tags' => ['sometimes', 'array'],
            'tags.*' => [new Enum(PostTag::class)],
            'is_featured' => ['sometimes', 'boolean'],
            'reading_minutes' => ['nullable', 'integer', 'min:1', 'max:180'],
            'priority' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'published_at' => ['nullable', 'date'],
        ];
    }
}
