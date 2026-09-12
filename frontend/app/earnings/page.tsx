"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/authStore";
import { StatusMessage } from "@/components/StatusMessage";
import { formatMoney } from "@/lib/format";
import type { ApiError, Earnings } from "@/lib/types/api";

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
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const signOut = useAuthStore((state) => state.signOut);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  const earningsQuery = useQuery({
    queryKey: ["earnings"],
    queryFn: getEarnings,
    enabled: ready && Boolean(token),
  });

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

  if (earningsQuery.isError) {
    return (
      <StatusMessage
        state="error"
        message={earningsErrorMessage(earningsQuery.error)}
      />
    );
  }

  const earnings = earningsQuery.data;

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
    </section>
  );
}