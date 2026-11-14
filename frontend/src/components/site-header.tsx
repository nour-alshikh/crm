"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { UserAvatar } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, isLoading, can, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-sm font-semibold">
          {t("app.name")}
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />

          {isLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 text-sm">
                <span className="h-7 w-7">
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatar_url}
                    alt=""
                    className="text-xs"
                  />
                </span>
                {user.name}
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  {t("nav.dashboard")}
                </DropdownMenuItem>

                {can("manage-users") && (
                  <DropdownMenuItem onClick={() => router.push("/admin/users")}>
                    {t("nav.manageUsers")}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout}>{t("nav.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4 text-sm">
              <Link href="/login" className="underline">
                {t("nav.login")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
