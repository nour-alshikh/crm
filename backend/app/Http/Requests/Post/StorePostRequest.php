<?php

namespace App\Http\Requests\Post;

use App\Enums\PostCategory;
use App\Enums\PostStatus;
use App\Enums\PostTag;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'array'],
            'title.en' => ['required', 'string', 'max:255'],
            'title.ar' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'status' => ['required', new Enum(PostStatus::class)],
            'category' => ['required', new Enum(PostCategory::class)],
            'tags' => ['array'],
            'tags.*' => [new Enum(PostTag::class)],
            'is_featured' => ['boolean'],
            'reading_minutes' => ['nullable', 'integer', 'min:1', 'max:180'],
            'priority' => ['required', 'integer', 'min:1', 'max:5'],
            'published_at' => ['nullable', 'date'],
        ];
    }
}
