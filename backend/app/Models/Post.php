<?php

namespace App\Models;

use App\Enums\PostCategory;
use App\Enums\PostStatus;
use App\Support\HasTranslations;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Post extends Model
{
    use HasFactory, HasTranslations;

    protected $fillable = [
        'title',
        'body',
        'status',
        'category',
        'tags',
        'is_featured',
        'reading_minutes',
        'priority',
        'published_at',
    ];

    protected $casts = [
        'title' => 'array',
        'status' => PostStatus::class,
        'category' => PostCategory::class,
        'tags' => 'array',
        'is_featured' => 'boolean',
        'reading_minutes' => 'integer',
        'priority' => 'integer',
        'published_at' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
