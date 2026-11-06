# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep route-level presentation in the existing React components and use the shared API client for relative `/api` requests. Each capability should expose loading, meaningful empty, and accessible error states, and render API data without taking on business or persistence logic.
- Logic tier decision: Keep HTTP handling and request validation in the Express routes/services. Return deliberate 4xx responses for invalid input, malformed IDs, missing referenced records, and unknown users; do not leak Mongoose cast or validation failures as 500 responses. Do not add authentication in this exercise.
- Data tier decision: Make Mongoose schemas enforce the documented required fields and defaults. Keep seed data representative and idempotent, linking users, teams, activities, and workouts without deleting or rewriting unrelated records.
- Activity tracking approach: Validate `userId`, `teamId`, activity type, and positive minutes before creating an activity. Resolve both referenced records, store them as `user` and `team`, and set `points` and `occurredAt` in the logic tier.
- Team management approach: Require a non-empty name and mascot, default members to an empty array, and preserve submitted member references when creating and listing teams.
- Leaderboard approach: Aggregate activity points per team, sort totals descending, and assign ranks starting at 1. Return the documented `teamName`, `totalPoints`, and `rank` fields.
- Workout suggestions approach: Find the requested user by email, use their fitness goal and recent activity to choose matching available workouts, and include a concise reason for the first suggestion. Return a 4xx response when the user is unknown.

Implement and verify in dependency order: data schemas and seed behavior, API/service behavior, then presentation. Within each tier, run its contract test before moving to the next tier.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — checks schema validation/defaults and repeatable, non-destructive seeding. Last observed: 4 failures in model validation and 1 passing seed test; failures point to the data tier.
- API command: `npm run test:api --prefix octofit-tracker/backend` — checks route validation, persistence, leaderboard aggregation, and workout recommendations. Last observed: all 4 contract tests failed, indicating missing or incomplete logic-tier behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — checks API rendering, loading/empty/error states, and accessible feedback across routes. Last observed: all 15 contract tests failed; routes still showed the implementation-pending state.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — checks TypeScript compilation; run after backend changes to catch type errors not covered by runtime contracts. No result recorded yet.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — checks TypeScript and the Vite production build; run after frontend changes. No result recorded yet.
