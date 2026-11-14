"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { applyServerErrors } from "@/lib/form-errors";
import { forgotPasswordSchema, type ForgotPasswordPayload } from "@/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<ForgotPasswordPayload>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordPayload) {
    try {
      const { data } = await api.POST("/auth/forgot-password", { body: values });
      setMessage(data?.message ?? null);
    } catch (err) {
      const message = applyServerErrors(form, err, ["email"]);
      if (message) toast.error(message);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          <h1 className="text-xl font-semibold">Forgot password</h1>

          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : (
            <>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </>
          )}

          <p className="text-center text-sm">
            <Link href="/login" className="underline">
              Back to log in
            </Link>
          </p>
        </form>
      </Form>
    </main>
  );
}
