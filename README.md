# Cursor Cost

A small Mac app that charts your personal Cursor spend. It does not need workspace admin access.

## Install

Download the latest macOS build from [Releases](https://github.com/jackaldenryan/cursor-cost-tracking/releases/latest).

If that page has no release yet, do **One-time GitHub setup** and **Publish a version** first, then come back here.

1. Download the `.dmg` for your Mac. Use the `aarch64` build on Apple Silicon, or the `x64` / `x86_64` build on Intel.
2. Open the disk image and drag **Cursor Cost** into Applications.
3. Open the app. If macOS blocks it, right-click the app, choose Open, then confirm. You can also run this in Terminal:

```
xattr -cr "/Applications/Cursor Cost.app"
```

4. When Settings opens, paste your Cursor session token using the steps below.

## Paste your Cursor session token

The app reads spend from cursor.com using your browser session cookie. It stores that token only on this Mac.

1. Open Chrome, Safari, or Arc and go to [cursor.com](https://cursor.com). Sign in if needed.
2. Open Developer Tools with F12 or Cmd+Option+I.
3. Open Application or Storage, then Cookies.
4. Find the cookie named `WorkosCursorSessionToken`, copy its value, and paste it into Settings.

Click **Save token**, then the charts load. Use **Refresh** later to pull new events.

## Updates

The app checks GitHub Releases every time it opens. If a newer version exists, it asks whether you want to install it.

You can also open Settings and click **Check for updates**. You do not need to download a new `.dmg` after the first install.

## One-time GitHub setup

Do this once before the first tagged release. The updater cannot ship without a signing key.

The private key already lives at `~/.tauri/cursor-cost-tracking.key` on this machine. Keep that file. If it is lost, existing installs cannot receive updates.

1. Open the repo on GitHub and add two Actions secrets:
   - `TAURI_SIGNING_PRIVATE_KEY`: the full contents of `~/.tauri/cursor-cost-tracking.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: leave this empty unless you set a password when the key was created
2. Confirm Actions has permission to create releases: **Settings → Actions → General → Workflow permissions → Read and write permissions**.

This command uploads the key without printing it:

```
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/cursor-cost-tracking.key
```

## Publish a version

Use this after the code you want is on `origin/main`.

1. Set the same version in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
2. Commit that bump and push it to `origin/main`.
3. From the repo root, tag and push the matching version:

```
./scripts/publish-tag.sh
```

That script reads the version, checks the three files match, then pushes `vX.Y.Z`. GitHub Actions builds both Mac architectures and attaches them to the GitHub release.

Open the installed app after the workflow finishes. It should offer the new version.

## What the charts show

Spend comes from Cursor's usage events API. Each bar is US dollars.

The app opens on today, grouped by hour. Change the bucket size (15 minutes, 1 hour, 1 day, 1 week, or 1 month) and pick any start and end date in the calendar, then click Apply. The left side of that picker has today / week-to-date / month-to-date / year-to-date, then rolling windows (24 hours, 48 hours, week, month, and so on).

The dollar amounts use Cursor's `totalCents` value when it is present.
