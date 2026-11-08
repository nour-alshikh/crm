import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  /** Pass `""` (empty alt) for decorative uses, e.g. next to a visible name. */
  alt: string;
  className?: string;
}

export function UserAvatar({ name, avatarUrl, alt, className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-full border bg-muted text-sm",
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
