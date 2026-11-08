"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { resolveTranslation } from "@/lib/i18n/resolve";
import { apiFetch, ApiError } from "@/lib/api";
import type { Post } from "@/types/post";
import { PostForm } from "@/components/post-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PostsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editingPost, setEditingPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login?redirect=/posts");
    }
  }, [isAuthLoading, user, router]);

  const {
    data: posts = [],
    isLoading: isLoadingPosts,
    error: postsError,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: () => apiFetch<{ posts: Post[] }>("/api/posts").then((d) => d.posts),
    enabled: !isAuthLoading && !!user,
  });

  useEffect(() => {
    if (!postsError) return;

    toast.error(
      postsError instanceof ApiError ? postsError.message : t("posts.loadError")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsError]);

  const deleteMutation = useMutation({
    mutationFn: (post: Post) =>
      apiFetch<void>(`/api/posts/${post.id}`, { method: "DELETE" }),
    onSuccess: (_data, post) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success(t("posts.deleted"));
      if (editingPost?.id === post.id) setEditingPost(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : t("posts.deleteError"));
    },
  });

  if (isAuthLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6">
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">
          {editingPost ? t("posts.editHeading") : t("posts.newHeading")}
        </h1>
        <PostForm
          key={editingPost?.id ?? "new"}
          post={editingPost ?? undefined}
          onSuccess={() => setEditingPost(null)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("posts.listHeading")}</h2>

        {isLoadingPosts ? (
          <p className="text-sm text-muted-foreground">{t("posts.loading")}</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("posts.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("posts.columns.title")}</TableHead>
                <TableHead>{t("posts.columns.status")}</TableHead>
                <TableHead>{t("posts.columns.category")}</TableHead>
                <TableHead>{t("posts.columns.author")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const isOwner = post.user.id === user.id;

                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      {resolveTranslation(post.title, locale)}
                      {post.is_featured && (
                        <span className="ms-2 text-xs text-muted-foreground">
                          {t("posts.featured")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{t(`posts.status.${post.status}`)}</TableCell>
                    <TableCell>{t(`posts.category.${post.category}`)}</TableCell>
                    <TableCell>{post.user.name}</TableCell>
                    <TableCell>
                      {isOwner && (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPost(post)}
                          >
                            {t("posts.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(post)}
                          >
                            {t("posts.delete")}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
