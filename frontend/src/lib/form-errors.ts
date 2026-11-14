import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ApiError } from "@/lib/api/errors";

/**
 * Maps a failed API call's field errors onto the corresponding react-hook-form
 * fields, so server-side validation (Laravel) renders inline exactly like
 * client-side zod validation does — same fields, same place.
 *
 * `knownFields` must list every field name the form actually renders an input
 * for. A server error for a field the form doesn't have — e.g. reset-password
 * getting an `email` error for an invalid/expired token, when `email` isn't a
 * user-editable field on that form — has nowhere visible to attach, so it's
 * folded into the returned top-level message instead of silently vanishing.
 *
 * Returns a message to show as a general/top-level error: either because
 * there was nothing more specific to attach it to, or because the error
 * wasn't a 422 with a per-field breakdown at all (network errors, 500s, rate
 * limiting).
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  knownFields: readonly Path<T>[],
): string | null {
  if (error instanceof ApiError && error.errors) {
    const unmapped: string[] = [];

    for (const [field, messages] of Object.entries(error.errors)) {
      if ((knownFields as readonly string[]).includes(field)) {
        form.setError(field as Path<T>, {
          type: "server",
          message: messages[0],
        });
      } else {
        unmapped.push(messages[0]);
      }
    }

    return unmapped.length > 0 ? unmapped.join(" ") : null;
  }

  return error instanceof ApiError ? error.message : "Something went wrong.";
}
