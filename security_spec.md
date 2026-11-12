# Security Specification — Kalolsavam Digital Judging App

## 1. Data Invariants

1. **Global Default Deny**: Any path not explicitly matched (`/items/{itemId}`, `/participants/{participantId}`, `/scores/{scoreId}`, `/admins/{adminId}`) is strictly denied for both read and write.
2. **Verified Identity & Ownership**: All writes require an authenticated user (`request.auth != null`) with `request.auth.token.email_verified == true`. On `create`, `incoming().authorId == request.auth.uid`.
3. **Path ID & Key Hardening**: Document path variables (`{itemId}`, `{participantId}`, `{scoreId}`) must pass `isValidId()` (`size() <= 128` and regex `^[a-zA-Z0-9_\-]+$`) on `get`, `create`, `update`, and `delete`, and `incoming().id` must equal the path ID.
4. **Strict Schema & Volumetric Bounds**:
   - `CompetitionItem`: `hasOnly` and `hasAll` exact keys `['id', 'name', 'malayalamName', 'category', 'stage', 'maxMarks', 'authorId', 'createdAt']`. `category in ['High School', 'Higher Secondary', 'General', 'Sub-Junior']`, `maxMarks == 100`.
   - `Participant`: `hasOnly` and `hasAll` exact keys `['id', 'itemId', 'chestNo', 'name', 'school', 'authorId', 'createdAt']`. `exists(/databases/$(database)/documents/items/$(incoming().itemId))` must be true on creation.
   - `JudgeScore`: `hasOnly` and `hasAll` exact keys `['id', 'itemId', 'participantId', 'chestNo', 'judgeSlot', 'judgeName', 'rhythm', 'expression', 'perfection', 'overall', 'total', 'remarks', 'authorId', 'createdAt', 'updatedAt']`. Each criterion (`rhythm`, `expression`, `perfection`, `overall`) is `>= 0 && <= 25`, and `total == rhythm + expression + perfection + overall` (`0 <= total <= 100`). Both `itemId` and `participantId` must exist in Firestore on creation.
5. **Temporal & Immutability Guarantees**: `createdAt == request.time` on `create` and `incoming().createdAt == existing().createdAt` on `update`. `updatedAt == request.time` on `create` and `update`. Immutable relational keys (`id`, `itemId`, `participantId`, `chestNo`, `judgeSlot`, `authorId`) cannot change during updates.
6. **Query Enforcer on List Operations**: `allow list` rules never delegate filtering silently; they validate `resource.data.maxMarks == 100` (for items), `resource.data.chestNo.size() <= 20` (for participants), and `resource.data.total <= 100` (for scores) alongside authentication.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Item Creation)**: Authenticated user `user_A` submits a `CompetitionItem` with `authorId: "user_B"`. Expected: `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Spoof Attack)**: Authenticated user with `email: "sajjadsajju2626@gmail.com"` but `email_verified: false` attempts to create an item. Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on Create)**: Creating a `CompetitionItem` with all valid fields plus an undeclared `"isWinner": true` field. Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Path ID Poisoning)**: Creating `/items/invalid$id!@#` or `/items/item_1` where `data.id == "item_2"`. Expected: `PERMISSION_DENIED`.
5. **Payload 5 (Orphaned Participant Creation)**: Creating a `Participant` referencing a non-existent `itemId: "ghost_item_999"`. Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Score Math Manipulation / Out-of-Range Total)**: Creating a `JudgeScore` where `rhythm: 25, expression: 25, perfection: 25, overall: 25` but `total: 150` (or `total: 90` not matching sum). Expected: `PERMISSION_DENIED`.
7. **Payload 7 (Criterion Overflow)**: Submitting a `JudgeScore` with `rhythm: 30, expression: 20, perfection: 25, overall: 25, total: 100`. Expected: `PERMISSION_DENIED`.
8. **Payload 8 (Client Timestamp Forgery)**: Creating a `JudgeScore` with a hardcoded past/future `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Update-Gap / Immutable Field Mutation)**: Updating an existing `JudgeScore` to change `participantId` or `authorId` via `update`. Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Value Poisoning on Update)**: Updating an existing `JudgeScore` with `affectedKeys` only changing `remarks`, but passing a 5,000-character string (`size() > 300`). Expected: `PERMISSION_DENIED`.
11. **Payload 11 (Cross-Judge Score Hijack)**: Authenticated `user_B` (non-admin) attempting to update or delete a `JudgeScore` authored by `user_A`. Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Self-Assigned Admin Escalation)**: Authenticated user attempting to write a document to `/admins/{uid}` to grant themselves admin rights. Expected: `PERMISSION_DENIED`.
