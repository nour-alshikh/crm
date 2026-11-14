import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { applyServerErrors } from "@/lib/form-errors";

type ResetForm = { password: string; password_confirmation: string };

function setup() {
  const { result } = renderHook(() => {
    const form = useForm<ResetForm>({ defaultValues: { password: "", password_confirmation: "" } });
    // react-hook-form only re-renders for formState keys a component reads;
    // real forms read `errors` to render messages, so subscribe the same way.
    void form.formState.errors;
    return form;
  });
  return result;
}

describe("applyServerErrors", () => {
  it("attaches each 422 field error to its form field (first message wins)", () => {
    const form = setup();
    const error = new ApiError(422, "The given data was invalid.", {
      password: ["Too short.", "Needs a number."],
      password_confirmation: ["Does not match."],
    });

    let message: string | null = "unset";
    act(() => {
      message = applyServerErrors(form.current, error, ["password", "password_confirmation"]);
    });

    expect(message).toBeNull();
    expect(form.current.formState.errors.password).toMatchObject({
      type: "server",
      message: "Too short.",
    });
    expect(form.current.formState.errors.password_confirmation?.message).toBe("Does not match.");
  });

  it("folds errors for fields the form does not render into the returned message", () => {
    const form = setup();
    const error = new ApiError(422, "Invalid.", {
      email: ["This password reset token is invalid."],
      password: ["Too short."],
    });

    let message: string | null = null;
    act(() => {
      message = applyServerErrors(form.current, error, ["password", "password_confirmation"]);
    });

    expect(message).toBe("This password reset token is invalid.");
    expect(form.current.formState.errors.password?.message).toBe("Too short.");
    expect(form.current.formState.errors).not.toHaveProperty("email");
  });

  it("joins several unmapped messages", () => {
    const form = setup();
    const error = new ApiError(422, "Invalid.", { email: ["A."], token: ["B."] });

    expect(applyServerErrors(form.current, error, ["password"])).toBe("A. B.");
  });

  it("returns the API message for non-validation API errors (e.g. 429, 500)", () => {
    const form = setup();

    expect(
      applyServerErrors(form.current, new ApiError(429, "Too many requests."), ["password"]),
    ).toBe("Too many requests.");
    expect(form.current.formState.errors).toEqual({});
  });

  it("falls back to a generic message for non-API errors (network failure)", () => {
    const form = setup();

    expect(applyServerErrors(form.current, new TypeError("Failed to fetch"), ["password"])).toBe(
      "Something went wrong.",
    );
  });
});
