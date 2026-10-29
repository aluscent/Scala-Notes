# Scala Material Notes (Play + Slick + H2 + React MUI)

A note-taking web app:
- Create / edit / delete notes
- Add / remove categories and tags (many-to-many)
- Material UI (MUI) frontend
- Embedded H2 database (no external DB install)

## Tech
- Backend: Play Framework 3.x , Slick 3.6.x , Flyway 11.x 
- DB: H2 embedded/file mode (auto-creates a local DB file) 
- Frontend: React + MUI 

## Prerequisites
- Java 17+ (Play recommends at least Java 17) 
- sbt
- Node.js 22

## Run (dev)
### 1) Backend
```bash
cd backend
sbt run
```
Backend runs on `http://localhost:9000` by default.

### 2) Frontend
```bash
cd frontend
npm ci
npm run dev
```
Frontend runs on `http://localhost:5173`.

The backend enables CORS for the dev frontend origin (`http://localhost:5173`).

## Data storage
On first startup, Flyway runs migrations and H2 creates a DB file in:
- `backend/data/notesdb.mv.db`

## Production build (single server)

From the repository root:

```sh
node scripts/build-frontend.mjs
cd backend
sbt stage
./target/universal/stage/bin/notes-backend -Dhttp.port=9000
```

Then open `http://localhost:9000/`. Protect the application before sharing a writable demo.

## Tested behavior and production packaging

- Search matches title **or content**, case-insensitively. `%`, `_` and `!` are
  literal text, not user-controlled SQL wildcards; Slick binds the value.
- `GET /api/notes?limit=50&offset=0` returns at most 100 notes. Invalid limits or
  negative offsets return 400. Ordering is updated time descending, then ID
  descending for ties. The UI has Previous/Next controls and resets on filters.
  Offset pages can shift when other users edit notes; this is not snapshot paging.
- H2 repository tests exercise search, paging, category/tag normalization, rollback
  on failed relationship updates, empty relationships and delete/get behavior.
  Run `cd backend && sbt test`.

Build the frontend with `node scripts/build-frontend.mjs` from the repository root,
then `cd backend && sbt stage`. This installs locked dependencies, builds React,
and copies the output into Play's public directory. `/assets/*` maps to that
build's assets directory. Production API calls use the same origin; Vite proxies
`/api` to localhost:9000 during development. Override `VITE_API_BASE` only when
hosting the API separately. CI verifies the frontend build and backend tests.

This application has unauthenticated write endpoints and a sample development
secret. Keep it local or protect the whole application with an identity gateway
before publishing a writable demo. It is not a multi-tenant hosted notes service.
