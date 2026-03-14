# Grid Notes GT7 Journal

Mobile-friendly static app for logging Gran Turismo 7 Sport Mode sessions, Time Trials, and short performance notes.

## What it does

- Saves session entries in browser local storage
- Tracks Daily Race and Time Trial results
- Loads searchable car and track reference data from CSV
- Surfaces simple patterns from your saved sessions
- Exports saved journal data as JSON for future LLM analysis
- Works as a static site with no backend

## Files

- `index.html`
- `styles.css`
- `script.js`
- `data/cars.csv`
- `data/tracks.csv`

## Run locally

```bash
cd /Users/yhippa/Downloads/new\ new\ project
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Note: the CSV-backed search uses `fetch`, so open the app through a local web server rather than `file://`.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In GitHub, open `Settings` -> `Pages`.
3. Under **Build and deployment**:
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`), folder `/ (root)`
4. Save and wait for deployment.
5. Open the generated Pages URL.

No build step is required.
