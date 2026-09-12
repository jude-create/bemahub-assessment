**Name:** IFEANYI AGU
**Date:** 12/09/2026
**Actual time spent:** 2hrs 56mins

## 1. What I completed

| Task | Status | Evidence file |
|---|---|---|
| 1 — Course list | done | `evidence/task-1-ui.png`, `evidence/task-1-network-header.png`,`evidence/task-1-network-response.png`, |
| 2 — Authentication | done | `evidence/task-2-signedout.png`, `evidence/task-2-signedin.png`, `evidence/task-2-network-header.png`, task-2-network-response.png`  |
| 3 — Withdrawal form | done | `evidence/task-3-validation.png`, `evidence/task-3-server-error.png`, `evidence/task-3-success.png`, `evidence/task-3-network.png` |
| 4 — PHP defects | Attempted but not completed  | 
| 5 — Database | done | `answers/task-5.md` |
| 6 — Infrastructure | done | `answers/task-6.md` |
| 7 — Python | not attempted | |
| 8 — Documentation | done | `SOLUTION.md` |

## 4. Specific questions

**Task 1:** I used the API response’s `previewExpiresInSeconds` as the React Query `staleTime` and refetch interval.  I chose automatic refetch because the endpoint explicitly provides an expiry value.

**Task 3:** `payoutReference` is generated once per withdrawal attempt so a retry after an uncertain network failure carries the same idempotency key. If the key changed on retry, the server would treat it as a new withdrawal request and could create a second payout even though the first request had already succeeded.

**Task 5.2:** The original unique key included `cancelled_at`. MySQL permits multiple `NULL` values in a unique index, so two rows with the same instructor and payout reference were allowed while both had `cancelled_at = NULL`. I added a new forward-only migration rather than changing `001_initial.sql` because the original migration was already applied; editing it would not update the running database and would rewrite migration history.

**Task 7:** Not attempted.


## 5. Anything wrong in our brief

I did not identify a contradiction in the written contract. I treated the API contract as authoritative where it differed from implementation behaviour.

## 6. AI Tool Usage — required

**Which tools did you use?** Codex / ChatGPT.

### 6a. Where AI was used

| Task | What AI produced | Accepted / rejected / modified |
|---|---|---|
| 1 | Initial implementation outline and React Query structure | Modified after reviewing the supplied API contract and verifying the running application. |
| 2 | Initial Axios interceptor, login, and earnings-route structure | Modified after checking the starter auth store and API error contract. |
| 3 | Initial react-hook-form, Zod, mutation, and idempotency-key implementation outline | Modified after checking the withdrawal API contract and testing error/success paths. |
| 5 | SQL investigation, migration, and join-query guidance | Reviewed and run against the local MySQL database; output is included in `answers/task-5.md`. |
| 6 | Structure for incident-diagnosis answers | Reviewed and adapted to explain ordered checks and reasoning. |


### 6b. What you accepted or rejected, and why

I accepted the use of React Query and API types because they match the task requirements and starter-package structure. I verified the expiry handling against the contract and retained distinct rendering for `null` and `0`. I did not accept any suggestion to use `useEffect` for the request because the brief explicitly requires React Query.


I accepted clearing stored authentication only on a `401`, because it represents missing or invalid credentials. I retained rejected Axios errors so the UI can distinguish a missing response (transport failure) from `401` and `403` API responses. I did not add Authorization headers to individual requests because the supplied Axios request interceptor already owns that responsibility.

I accepted using a Zod schema built from the loaded earnings response because the minimum withdrawal and available balance are server-controlled. I accepted using React Query invalidation after success so the displayed balance is refreshed. I kept the same payout reference for an unconfirmed transport failure, but clear it after a confirmed 422 refusal because no withdrawal was created and the corrected submission is a new attempt.


### 6c. What you verified yourself, and how

I opened `/courses`, inspected the rendered course list, and used the browser Network panel to verify the request URL, `200` status, and response body. I also ran `npm run typecheck` and `npm run build`.

I verified signed-out `/earnings`, instructor sign-in and displayed balance, sign-out behaviour, and the Authorization header in DevTools. I redacted the bearer token in the saved network screenshot. I also tested the learner account on `/earnings` and recorded the observed status.

I verified client-side amount validation, a server refusal rendered on the amount field, a successful withdrawal, the refreshed balance, and the Idempotency-Key in DevTools. I redacted any Authorization token visible in saved screenshots. I also ran `npm run typecheck` and `npm run build`.


### 6d. Assumptions you made

I treated `previewExpiresInSeconds` as the time after which the client should refetch the course preview. I relied on the API contract as authoritative if the running backend behaved differently.



## 7. Assumptions and trade-offs

The withdrawal form accepts amounts in minor units/kobo to match the API contract and avoid decimal-conversion errors within the time limit. The trade-off is weaker usability because instructors naturally think in naira. In production, I would accept naira input, validate a maximum of two decimal places, and safely convert it to an integer minor-unit amount before making the API request.

The course list automatically refreshes after the server-provided preview expiry. This creates additional requests compared with waiting for another user action, but makes the API freshness contract explicit.

## 8. If this went to production tomorrow

I would add automated component and end-to-end tests for course loading/error/empty states, null-versus-zero rendering, login expiry, learner authorization, server validation mapping, successful balance refresh, and idempotency retries.

I would improve the withdrawal user experience by accepting formatted naira input rather than kobo. I would also provide an explicit retry action that visibly reuses the original payout reference after an uncertain network failure.

For the backend, I would add automated authorization and contract tests so a learner cannot access instructor earnings and unpublished courses cannot be exposed by a future query change. I would also ensure forward migrations are automatically applied and checked through the deployment process.
