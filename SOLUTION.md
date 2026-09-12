**Name:** <your name>
**Date:** <date>
**Actual time spent:** <running total>

## 1. What I completed

| Task | Status | Evidence file |
|---|---|---|
| 1 — Course list | done | `evidence/task-1-ui.png`, `evidence/task-1-network-header.png`,`evidence/task-1-network-response.png`, |
| 2 — Authentication | done | `evidence/task-2-signedout.png`, `evidence/task-2-signedin.png`, `evidence/task-2-network-header.png`, task-2-network-response.png`  |
| 3 — Withdrawal form | done | `evidence/task-3-validation.png`, `evidence/task-3-server-error.png`, `evidence/task-3-success.png`, `evidence/task-3-network.png` |

## 4. Specific questions

**Task 1:** I used the API response’s `previewExpiresInSeconds` as the React Query `staleTime` and refetch interval.  I chose automatic refetch because the endpoint explicitly provides an expiry value.

**Task 3:** `payoutReference` is generated once per withdrawal attempt so a retry after an uncertain network failure carries the same idempotency key. If the key changed on retry, the server would treat it as a new withdrawal request and could create a second payout even though the first request had already succeeded.

## 6. AI Tool Usage — required

**Which tools did you use?** Codex / ChatGPT.

### 6a. Where AI was used

| Task | What AI produced | Accepted / rejected / modified |
|---|---|---|
| 1 | Initial implementation outline and React Query structure | Modified after reviewing the supplied API contract and verifying the running application. |
| 2 | Initial Axios interceptor, login, and earnings-route structure | Modified after checking the starter auth store and API error contract. |
| 3 | Initial react-hook-form, Zod, mutation, and idempotency-key implementation outline | Modified after checking the withdrawal API contract and testing error/success paths. |

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

The page refreshes the list at the expiry time rather than only marking it stale and waiting for another user action. This slightly increases requests but makes the expiry behaviour  predictable.

The form uses minor units directly because the API explicitly models money as integers in minor units. In a production user-facing product, I would likely accept a formatted currency amount and convert it carefully at the edge, with locale-specific input handling and additional accessibility testing.

## 8. If this went to production tomorrow

For the course list, I would add automated tests for loading, transport-error, empty, `null`, and real-zero rendering states. I would also verify the refresh behaviour under slow or intermittent networks.. The implementation trusts the API to return only published courses, as specified by the contract; I would monitor and test that backend permission/filtering rule because the frontend must not be relied on to prevent unpublished-course disclosure.

I would add automated component and end-to-end tests for authentication expiry, learner authorization, server validation mapping, duplicate idempotency-key handling, and uncertain network retries. I would also add better retry UX that explicitly offers a retry with the preserved payout reference rather than relying on the user submitting the form again.

In a real production UI, I would instead let the instructor enter ₦500.00, validate two decimal places, then safely convert it to 50000 minor units only when sending the request. For this timed assessment, accepting minor units directly is defensible because that is what the API contract explicitly require.