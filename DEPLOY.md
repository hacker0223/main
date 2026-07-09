# Deploying Summit

## 1. Push to GitHub

```
git remote add origin <your-repo-url>
git push -u origin master
```

## 2. Deploy the backend to Render

1. Sign in at [render.com](https://render.com), connect your GitHub account.
2. **New → Blueprint**, select this repo. Render will read `render.yaml` at
   the repo root and propose two services: `summit-pattern-engine` (Python)
   and `summit-api` (Node).
3. Before the first deploy completes, set these secrets on **summit-api**
   (Render dashboard → summit-api → Environment):
   - `FINNHUB_API_KEY` — your Finnhub key
   - `ANTHROPIC_API_KEY` — your Anthropic key
4. Once **summit-pattern-engine** finishes deploying, copy its public URL
   (shown at the top of its Render dashboard page — looks like
   `https://summit-pattern-engine-xxxx.onrender.com`) and set it as
   `PATTERN_ENGINE_URL` on **summit-api**.
5. Wait for **summit-api** to redeploy with that value, then copy *its*
   public URL too — you'll need it in the next step.

Both services are on Render's free tier, which spins down after ~15 minutes
of inactivity — the first request after idle will be slow (~30–60s cold
start) while it spins back up. Fine for early testing; worth upgrading to a
paid instance before real user traffic.

## 3. Point the mobile app at the deployed backend

Edit `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://summit-api-xxxx.onrender.com
```

(Replace the LAN IP that's there now — that only ever worked for your own
phone on your own Wi-Fi.)

## 4. Build for the App Store

Requires an [Apple Developer account](https://developer.apple.com/programs/)
($99/year — start this enrollment early, approval isn't instant) and an
[Expo account](https://expo.dev) (free).

```
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure          # links this project to your Expo account
eas build --platform ios --profile production
```

EAS will prompt to create/select your App Store Connect app record and
handle signing certificates. Once the build finishes:

```
eas submit --platform ios
```

This uploads the build to App Store Connect / TestFlight.

## 5. Before submitting for review

- [ ] App Store Connect listing: screenshots, description, keywords,
      support URL, age rating, category
- [ ] Privacy Policy URL — `docs/privacy.html` in this repo, host via GitHub
      Pages (repo Settings → Pages → deploy from `/docs`) once pushed
- [ ] Terms of Service — `docs/terms.html`, same hosting
- [ ] TestFlight a few real testers before submitting for review

## Note on `apps/pattern-engine`'s committed data/models

`apps/pattern-engine/data/*.parquet` and `apps/pattern-engine/models/*.pkl`
are committed as a frozen snapshot so Render has something to serve
immediately — see the comment in `.gitignore` and the commit that added
them. This is a deliberate v1 shortcut, not the long-term plan: retraining
should eventually run on a schedule with its output stored somewhere other
than git.
