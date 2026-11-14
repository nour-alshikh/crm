"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

export function AvatarUploader() {
  const { user, uploadAvatar, removeAvatar } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);

    try {
      await uploadAvatar(file);
      toast.success("Avatar updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? (err.errors?.avatar?.[0] ?? err.message)
          : "Failed to upload avatar.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);

    try {
      await removeAvatar();
      toast.success("Avatar removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove avatar.");
    } finally {
      setIsRemoving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-20 w-20">
        <UserAvatar name={user.name} avatarUrl={user.avatar_url} alt={`${user.name}'s avatar`} />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading…" : "Change avatar"}
        </Button>

        {user.avatar_url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? "Removing…" : "Remove"}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
