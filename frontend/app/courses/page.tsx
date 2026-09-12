"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { StatusMessage } from "@/components/StatusMessage";
import { formatMoney, formatNullableNumber } from "@/lib/format";
import type { CourseListResponse } from "@/lib/types/api";

async function getCourses(): Promise<CourseListResponse> {
  const response = await api.get<CourseListResponse>("/courses");
  return response.data;
}

function courseErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && !error.response) {
    return "Unable to reach the course service. Check your connection and try again.";
  }

  return "Unable to load courses. Please try again.";
}

export default function CoursesPage() {
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: getCourses,

    // The response decides when the preview is stale.
    staleTime: (query) =>
      (query.state.data?.previewExpiresInSeconds ?? 0) * 1000,

    // This actively refreshes at the server-provided expiry time.
    refetchInterval: (query) =>
      (query.state.data?.previewExpiresInSeconds ?? false) && 
      (query.state.data?.previewExpiresInSeconds ?? 0) * 1000,
  });

  if (coursesQuery.isLoading) {
    return <StatusMessage state="loading" message="Loading courses…" />;
  }

  if (coursesQuery.isError) {
    return (
      <StatusMessage
        state="error"
        message={courseErrorMessage(coursesQuery.error)}
      />
    );
  }

  const courses = coursesQuery.data.courses;

  if (courses.length === 0) {
    return <StatusMessage state="empty" message="No published courses yet." />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Courses</h2>
        <p className="mt-1 text-slate-600">
          Browse currently published courses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <article
            key={course.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold">{course.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Instructor: {course.instructorName}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Price</dt>
                <dd className="font-medium">
                  {formatMoney(course.priceMinor, course.currency)}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Enrolments</dt>
                <dd className="font-medium">
                  {formatNullableNumber(course.enrolmentCount)}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">Rating</dt>
                <dd className="font-medium">
                  {course.averageRating === null
                    ? "—"
                    : `${course.averageRating} / 5`}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}