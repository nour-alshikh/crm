<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `title` moves from a plain string to a { "en": ..., "ar": ... } JSON
 * object — see docs/i18n.md. Existing values are wrapped as the default
 * locale's translation rather than dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->renameColumn('title', 'title_legacy');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->json('title')->nullable()->after('title_legacy');
        });

        DB::table('posts')->orderBy('id')->each(function ($post) {
            DB::table('posts')
                ->where('id', $post->id)
                ->update(['title' => json_encode(['en' => $post->title_legacy])]);
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->json('title')->nullable(false)->change();
            $table->dropColumn('title_legacy');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('title_legacy')->nullable()->after('title');
        });

        DB::table('posts')->orderBy('id')->each(function ($post) {
            $translations = json_decode($post->title, true) ?? [];
            $value = $translations[config('app.fallback_locale')] ?? reset($translations) ?: '';

            DB::table('posts')->where('id', $post->id)->update(['title_legacy' => $value]);
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('title');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->renameColumn('title_legacy', 'title');
        });
    }
};
