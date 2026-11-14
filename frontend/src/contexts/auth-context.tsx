"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { LoginPayload } from "@/lib/schemas";
import type { User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_QUERY_KEY = ["auth", "user"];

const AUTH_STATUS_COOKIE = process.env.NEXT_PUBLIC_AUTH_STATUS_COOKIE ?? "auth_status";

function hasAuthStatusCookie(): boolean {
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${AUTH_STATUS_COOKIE}=`));
}

async function fetchCurrentUser(): Promise<User | null> {
  // No marker cookie means no session was ever established — skip the
  // request instead of firing a guaranteed 401 on every guest page load.
  if (!hasAuthStatusCookie()) {
    return null;
  }

  try {
    const { data } = await api.GET("/user");
    return data?.data ?? null;
  } catch (error) {
    // "Not logged in" is a valid, successful result for this query, not a
    // failure to retry.
    if (error instanceof ApiError && error.code === "unauthenticated") {
      return null;
    }

    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
  });

  const setUser = useCallback(
    (next: User | null) => queryClient.setQueryData<User | null>(USER_QUERY_KEY, next),
    [queryClient],
  );

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => api.POST("/auth/login", { body: payload }),
    onSuccess: ({ data }) => setUser(data?.data ?? null),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.POST("/auth/logout"),
    onSuccess: () => setUser(null),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) =>
      api.POST("/user/avatar", {
        // The spec types binary fields as string; the real payload is the File,
        // sent as multipart (openapi-fetch leaves FormData untouched).
        body: { avatar: file as unknown as string },
        bodySerializer: () => {
          const formData = new FormData();
          formData.append("avatar", file);
          return formData;
        },
      }),
    onSuccess: ({ data }) => setUser(data?.data ?? null),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => api.DELETE("/user/avatar"),
    onSuccess: () =>
      queryClient.setQueryData<User | null>(USER_QUERY_KEY, (prev) =>
        prev ? { ...prev, avatar_url: null } : prev,
      ),
  });

  const login = useCallback(
    async (payload: LoginPayload) => {
      await loginMutation.mutateAsync(payload);
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const uploadAvatar = useCallback(
    async (file: File) => {
      await uploadAvatarMutation.mutateAsync(file);
    },
    [uploadAvatarMutation],
  );

  const removeAvatar = useCallback(async () => {
    await removeAvatarMutation.mutateAsync();
  }, [removeAvatarMutation]);

  const can = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const hasRole = useCallback((role: string) => user?.roles.includes(role) ?? false, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        can,
        hasRole,
        uploadAvatar,
        removeAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
