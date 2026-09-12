**Name:** <your name>
**Date:** <date>
**Actual time spent:** <running total>

## 1. What I completed

| Task | Status | Evidence file |
|---|---|---|
| 1 — Course list | done | `evidence/task-1-ui.png`, `evidence/task-1-network-header.png`,`evidence/task-1-network-response.png`, |
| 2 — Authentication | done | `evidence/task-2-signedout.png`, `evidence/task-2-signedin.png`, `evidence/task-2-network-header.png`, task-2-network-response.png`
| 3 — Withdrawal form | not attempted | |

## 4. Specific questions

**Task 1:** I used the API response’s `previewExpiresInSeconds` as the React Query `staleTime` and refetch interval.  I chose automatic refetch because the endpoint explicitly provides an expiry value.

## 6. AI Tool Usage — required

**Which tools did you use?** Codex / ChatGPT.

### 6a. Where AI was used

| Task | What AI produced | Accepted / rejected / modified |
|---|---|---|
| 1 | Initial implementation outline and React Query structure | Modified after reviewing the supplied API contract and verifying the running application. |
| 2 | Initial Axios interceptor, login, and earnings-route structure | Modified after checking the starter auth store and API error contract. |

### 6b. What you accepted or rejected, and why

I accepted the use of React Query and API types because they match the task requirements and starter-package structure. I verified the expiry handling against the contract and retained distinct rendering for `null` and `0`. I did not accept any suggestion to use `useEffect` for the request because the brief explicitly requires React Query.


I accepted clearing stored authentication only on a `401`, because it represents missing or invalid credentials. I retained rejected Axios errors so the UI can distinguish a missing response (transport failure) from `401` and `403` API responses. I did not add Authorization headers to individual requests because the supplied Axios request interceptor already owns that responsibility.


### 6c. What you verified yourself, and how

I opened `/courses`, inspected the rendered course list, and used the browser Network panel to verify the request URL, `200` status, and response body. I also ran `npm run typecheck` and `npm run build`.

I verified signed-out `/earnings`, instructor sign-in and displayed balance, sign-out behaviour, and the Authorization header in DevTools. I redacted the bearer token in the saved network screenshot. I also tested the learner account on `/earnings` and recorded the observed status.


### 6d. Assumptions you made

I treated `previewExpiresInSeconds` as the time after which the client should refetch the course preview. I relied on the API contract as authoritative if the running backend behaved differently.

## 7. Assumptions and trade-offs

The page refreshes the list at the expiry time rather than only marking it stale and waiting for another user action. This slightly increases requests but makes the expiry behaviour  predictable.

## 8. If this went to production tomorrow

For the course list, I would add automated tests for loading, transport-error, empty, `null`, and real-zero rendering states. I would also verify the refresh behaviour under slow or intermittent networks.. The implementation trusts the API to return only published courses, as specified by the contract; I would monitor and test that backend permission/filtering rule because the frontend must not be relied on to prevent unpublished-course disclosure.