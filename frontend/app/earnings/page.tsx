"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/authStore";
import { StatusMessage } from "@/components/StatusMessage";
import { formatMoney } from "@/lib/format";
import type { ApiError, Earnings, Withdrawal } from "@/lib/types/api";

async function getEarnings(): Promise<Earnings> {
  const response = await api.get<Earnings>("/me/earnings");
  return response.data;
}

function earningsErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    if (!error.response) {
      return "Unable to reach the earnings service. Check your connection and try again.";
    }

    if (error.response.status === 401) {
      return "You are signed out. Please sign in to view earnings.";
    }

    if (error.response.status === 403) {
      return "Your account is not permitted to view instructor earnings.";
    }

    return error.response.data.message;
  }

  return "Unable to load earnings. Please try again.";
}

export default function EarningsPage() {
  const queryClient = useQueryClient();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const signOut = useAuthStore((state) => state.signOut);

  const [ready, setReady] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  // Retained after a network-uncertain failure so retry uses the same key.
  const payoutReferenceRef = useRef<string | null>(null);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  const earningsQuery = useQuery({
    queryKey: ["earnings"],
    queryFn: getEarnings,
    enabled: ready && Boolean(token),
  });

  const earnings = earningsQuery.data;

  const withdrawalSchema = useMemo(() => {
    const minimum = earnings?.minimumWithdrawalMinor ?? 0;
    const available = earnings?.availableMinor ?? 0;

    return z.object({
      amountMinor: z
        .number({
          invalid_type_error: "Enter a whole-number amount in kobo.",
        })
        .int("Amount must be a whole number of kobo.")
        .positive("Amount must be greater than zero.")
        .min(
          minimum,
          `Amount must be at least ${minimum.toLocaleString()} kobo.`
        )
        .max(
          available,
          `Amount cannot exceed ${available.toLocaleString()} kobo.`
        ),
    });
  }, [earnings?.availableMinor, earnings?.minimumWithdrawalMinor]);

  type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
  });

  const withdrawalMutation = useMutation({
    mutationFn: async ({
      amountMinor,
      payoutReference,
    }: WithdrawalFormValues & { payoutReference: string }) => {
      const response = await api.post<Withdrawal>(
        "/me/withdrawals",
        {
          amountMinor,
          payoutReference,
        },
        {
          headers: {
            "Idempotency-Key": payoutReference,
          },
        }
      );

      return response.data;
    },

    onSuccess: async () => {
      payoutReferenceRef.current = null;
      form.reset();
      setFormMessage("Withdrawal request submitted successfully.");
      await queryClient.invalidateQueries({ queryKey: ["earnings"] });
    },

    onError: (error: unknown) => {
      if (!axios.isAxiosError<ApiError>(error)) {
        setFormMessage("Unable to request withdrawal.");
        return;
      }

      if (!error.response) {
        setFormMessage(
          "We could not confirm the result. Retry this submission to reuse the same payout reference."
        );
        return;
      }

      const { code, message } = error.response.data;

      if (code === "below_minimum" || code === "insufficient_balance") {
        form.setError("amountMinor", {
          type: "server",
          message,
        });

        // A confirmed 422 means no withdrawal was created.
        payoutReferenceRef.current = null;
        return;
      }

      setFormMessage(message || "Unable to request withdrawal.");
    },
  });

  function onSubmit(values: WithdrawalFormValues) {
    setFormMessage(null);

    const payoutReference =
      payoutReferenceRef.current ?? `wd_${crypto.randomUUID()}`;

    payoutReferenceRef.current = payoutReference;

    // Use mutate rather than mutateAsync so an expected 422 does not
    // become an unhandled Next.js runtime error.
    withdrawalMutation.mutate({
      ...values,
      payoutReference,
    });
  }

  if (!ready) {
    return <StatusMessage state="loading" message="Checking your session…" />;
  }

  if (!token) {
    return (
      <section className="space-y-4">
        <StatusMessage
          state="error"
          message="You are signed out. Sign in to view earnings."
        />
        <Link className="text-blue-600 underline" href="/login">
          Go to sign in
        </Link>
      </section>
    );
  }

  if (earningsQuery.isLoading) {
    return <StatusMessage state="loading" message="Loading earnings…" />;
  }

  if (earningsQuery.isError || !earnings) {
    return (
      <StatusMessage
        state="error"
        message={earningsErrorMessage(earningsQuery.error)}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Earnings</h2>
          <p className="mt-1 text-slate-600">
            Signed in as {user?.name ?? "instructor"}.
          </p>
        </div>

        <button
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          type="button"
          onClick={signOut}
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Available to withdraw</p>
          <p className="mt-1 text-2xl font-bold">
            {formatMoney(earnings.availableMinor, earnings.currency)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold">
            {formatMoney(earnings.pendingMinor, earnings.currency)}
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h3 className="text-lg font-semibold">Request a withdrawal</h3>
          <p className="mt-1 text-sm text-slate-600">
            Minimum withdrawal:{" "}
            {formatMoney(
              earnings.minimumWithdrawalMinor,
              earnings.currency
            )}{" "}
            ({earnings.minimumWithdrawalMinor.toLocaleString()} kobo).
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">
            Withdrawal amount (kobo)
          </span>

          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            aria-invalid={Boolean(form.formState.errors.amountMinor)}
            {...form.register("amountMinor", {
              valueAsNumber: true,
            })}
          />
        </label>

        <p className="text-sm text-slate-600">
          Enter a whole number of kobo. For example, ₦500.00 is 50,000 kobo.
        </p>

        {form.formState.errors.amountMinor && (
          <p className="text-sm text-red-700">
            {form.formState.errors.amountMinor.message}
          </p>
        )}

        {formMessage && (
          <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {formMessage}
          </p>
        )}

        <button
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={withdrawalMutation.isPending}
        >
          {withdrawalMutation.isPending
            ? "Submitting…"
            : "Request withdrawal"}
        </button>
      </form>
    </section>
  );
}