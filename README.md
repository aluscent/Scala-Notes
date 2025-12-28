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
- Node.js 18+ (recommended)

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
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

The backend enables CORS for the dev frontend origin (`http://localhost:5173`).

## Data storage
On first startup, Flyway runs migrations and H2 creates a DB file in:
- `backend/data/notesdb.mv.db`

## Production build (single server)
1) Build the frontend:
```bash
cd frontend
npm install
npm run build
```

2) Copy the build into Play’s `public/` folder:
```bash
rm -rf ../backend/public
mkdir -p ../backend/public
cp -R dist/* ../backend/public/
```

3) Package and run the backend:
```bash
cd ../backend
sbt stage
./target/universal/stage/bin/notes-backend -Dhttp.port=9000
```

Then open `http://localhost:9000/`.
