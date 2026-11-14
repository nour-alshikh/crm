import { z } from "zod";
import type { PostCategory, PostStatus, PostTag } from "@/types/post";

// Mirrors the option lists PostStatus/PostCategory/PostTag are generated
// from on the backend (see app/Enums) — keep in sync with those enums.
export const postStatusOptions = ["draft", "published"] as const satisfies readonly PostStatus[];
export const postCategoryOptions = [
  "general",
  "tutorial",
  "news",
  "opinion",
] as const satisfies readonly PostCategory[];
export const postTagOptions = [
  "laravel",
  "nextjs",
  "typescript",
  "react",
  "php",
  "testing",
] as const satisfies readonly PostTag[];

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginPayload = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>;

// token/email aren't user-editable form fields (they come from the reset
// link's URL), so they're merged in at submit time rather than being part of
// the schema react-hook-form validates against.
export const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export interface ResetPasswordPayload extends ResetPasswordFormValues {
  token: string;
  email: string;
}

// Mirrors StorePostRequest/UpdatePostRequest's title.en/title.ar rules —
// see docs/i18n.md. `ar` is optional (falls back to `en` when displayed),
// `en` (the default locale) is required.
export const translatableTextSchema = z.object({
  en: z.string().min(1, "English translation is required").max(255),
  ar: z.string().max(255).optional().or(z.literal("")),
});

export const postSchema = z.object({
  title: translatableTextSchema,
  body: z.string().min(1, "Content is required"),
  status: z.enum(postStatusOptions),
  category: z.enum(postCategoryOptions),
  tags: z.array(z.enum(postTagOptions)),
  is_featured: z.boolean(),
  reading_minutes: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 minute")
    .max(180, "Must be 180 minutes or less"),
  priority: z.coerce.number().int().min(1).max(5),
  // Empty string means "no publish date yet" — converted to null at submit
  // time (see PostForm), since a native date input can't hold null itself.
  published_at: z.string(),
});

// reading_minutes/priority use z.coerce, so the schema's input type (raw
// form state, pre-coercion) and output type (after validation) differ —
// PostFormInput feeds useForm/defaultValues, PostFormValues is what
// handleSubmit hands to the submit callback.
export type PostFormInput = z.input<typeof postSchema>;
export type PostFormValues = z.output<typeof postSchema>;
