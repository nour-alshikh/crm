<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable()->after('email');
            $table->string('job_title', 120)->nullable()->after('phone');
            $table->foreignId('team_id')->nullable()->after('job_title')->constrained('teams')->nullOnDelete();
            // Overrides the company timezone (app_settings, step 1.11) when set.
            $table->string('timezone', 64)->nullable()->after('locale');
            // Inactive users cannot sign in and are skipped by round-robin.
            $table->boolean('is_active')->default(true)->index()->after('timezone');
            $table->boolean('receives_leads')->default(true)->after('is_active');
            $table->boolean('is_away')->default(false)->after('receives_leads');
            $table->json('preferences')->nullable()->after('is_away');
            $table->timestamp('last_seen_at')->nullable()->after('preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('team_id');
            $table->dropIndex(['is_active']);
            $table->dropColumn([
                'phone', 'job_title', 'timezone', 'is_active',
                'receives_leads', 'is_away', 'preferences', 'last_seen_at',
            ]);
        });
    }
};
