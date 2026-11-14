import type { components } from "@/lib/api/schema";

type PostResource = components["schemas"]["PostResource"];

export type PostStatus = components["schemas"]["PostStatus"];
export type PostCategory = components["schemas"]["PostCategory"];
export type PostTag = components["schemas"]["PostTag"];
export type PostAuthorType = PostResource["user"];

/** A translatable field's `{ en, ar }` shape (docs/i18n.md). */
export type TranslatableText = Exclude<PostResource["title"], string>;

/**
 * The API returns `title` as `{ en, ar }` unless `?lang=` is passed, which
 * this app never does, so the frontend works with the object form only.
 */
export type Post = Omit<PostResource, "title"> & { title: TranslatableText };
