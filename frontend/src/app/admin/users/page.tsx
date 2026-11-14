"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminUser } from "@/types/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminUsersPage() {
  const { user, isLoading: isAuthLoading, can } = useAuth();
  const router = useRouter();

  const isAuthorized = can("manage-users");

  useEffect(() => {
    if (!isAuthLoading && (!user || !isAuthorized)) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, user, isAuthorized, router]);

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiFetch<{ users: AdminUser[] }>("/api/admin/users").then((data) => data.users),
    // The permission check above is only a UX shortcut; the API is the real
    // authority, so don't even fetch until we know the check passed — and a
    // 403 back from the API itself is still handled below regardless.
    enabled: !isAuthLoading && isAuthorized,
  });

  useEffect(() => {
    if (!usersError) return;

    toast.error(usersError instanceof ApiError ? usersError.message : "Failed to load users.");
  }, [usersError]);

  if (isAuthLoading || !user || !isAuthorized) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Users</h1>

      {isLoadingUsers ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : usersError ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load users.</p>
      ) : (
        <Table className="max-w-2xl">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.roles.map((role) => role.name).join(", ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
