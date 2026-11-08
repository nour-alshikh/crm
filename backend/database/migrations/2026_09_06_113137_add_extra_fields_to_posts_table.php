<?php

use App\Enums\PostCategory;
use App\Enums\PostStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('status')->default(PostStatus::Draft->value)->after('body');
            $table->string('category')->default(PostCategory::General->value)->after('status');
            $table->json('tags')->nullable()->after('category');
            $table->boolean('is_featured')->default(false)->after('tags');
            $table->unsignedSmallInteger('reading_minutes')->nullable()->after('is_featured');
            $table->unsignedTinyInteger('priority')->default(3)->after('reading_minutes');
            $table->date('published_at')->nullable()->after('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'category',
                'tags',
                'is_featured',
                'reading_minutes',
                'priority',
                'published_at',
            ]);
        });
    }
};
