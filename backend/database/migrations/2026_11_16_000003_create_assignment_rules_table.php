<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_rules', function (Blueprint $table) {
            $table->id();
            // One rule per team; the row also holds the round-robin pointer,
            // locked with SELECT … FOR UPDATE when assigning (ADR-026).
            $table->foreignId('team_id')->unique()->constrained('teams')->cascadeOnDelete();
            $table->string('strategy', 32)->default('round_robin');
            $table->foreignId('last_assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_rules');
    }
};
