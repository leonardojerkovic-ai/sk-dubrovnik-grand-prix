# Phase 3 — Tournament Operations

## 3A — Tournament management
- Admin tournament list with filters by season, status, stage and category.
- Create/edit/publish/unpublish tournament.
- Validate dates, registration deadline, capacity and final/regular stage.
- Preserve the DGP scoring/ranking engine from Phase 2.

## 3B — Registration workflow
- Public registration against published tournaments with open registration.
- Eligibility validation from tournament/season/category rules.
- Admin review: REGISTERED → CONFIRMED / REJECTED.
- Prevent duplicate registrations and enforce capacity.

## 3C — Results workflow
- Enter/import results.
- Validate before finalization.
- Finalize tournament and automatically recalculate points/rankings.
- Lock finalized results against unauthorized edits.

## 3D — Final workflow
- General and Junior Final qualification visibility.
- Confirm/decline/replacement/no-show state machine.
- Protected Final results.

## 3E — Production readiness
- End-to-end workflow tests.
- Public results and ranking integration.
- Admin UX polish and error handling.

Phase 3 starts with 3A. No production data is changed by this plan file.
