# Mobile app

Status: **proposed**. Not implemented yet. Planned together with the deployment.

This file describes how CatZilla is used from a phone like an app, without publishing it in an app store. It builds on [requirements.md](requirements.md) and [technology-choices.md](technology-choices.md).

# Decision

CatZilla becomes a **Progressive Web App (PWA)**: the same web app, installed on the home screen, which opens full screen like a native app. We don't build a native app or publish it in an app store.

Why:
* The shelter can't pay for a Google Play developer account for now, and an Apple developer account costs more.
* Volunteers use a mix of Android phones and iPhones. A PWA works on both from the same code.
* The app is already mobile-first. A PWA only adds a manifest, icons and a small service worker.
* There's no second codebase, no build per store and no review process. An update is live as soon as it's deployed.

# Answers from the stakeholder

| # | Question | Answer | Consequence |
|---|---|---|---|
| 1 | Volunteers' phones | Not known, probably mixed. | Target Android and iOS. Test on Android first, where PWA support is best. |
| 2 | What "native-like" means | Home-screen icon and full screen. Native-style navigation. | Manifest with `display: standalone`, icons, splash screen, polished mobile navigation. Push notifications and share/camera integration are **not** in scope. |
| 3 | Offline use | Still not needed. | The service worker caches only the app shell. The data always comes from the API. |
| 4 | When | Document it now. Implement it later. | This file. Implementation goes with the deployment, which provides HTTPS anyway. |

# What to build

## Installability
* **Web app manifest** (`web/public/manifest.webmanifest`) with `name` and `short_name` "CatZilla", `lang: "it"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `theme_color` matching the existing `<meta name="theme-color">` (`#7a3e9d`), and a `background_color` for the splash screen.
* **Icons**: PNG 192×192 and 512×512, plus a *maskable* 512×512 variant for Android adaptive icons. Also a 180×180 `apple-touch-icon`, because iOS ignores the manifest icons. They can be generated from the existing `favicon.svg`.
* **iOS meta tags** in `web/index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`.
* **Service worker**: needed for Chrome on Android to offer installation. Suggested tool: `vite-plugin-pwa` (Workbox), which generates the service worker and the manifest at build time. Use it in `generateSW` mode:
  * Precache the built static files (JS, CSS, icons, `index.html`).
  * **Never cache `/api/*`.** Balances and movements must always be current, and cached responses would also hide 401s and break the session handling in `App.tsx`.
  * Update strategy: when a new version is deployed, show a small "Nuova versione disponibile — Aggiorna" banner instead of reloading silently, so a form being filled in isn't lost.
* **Offline**: when there is no network, show a clear "Sei offline" message instead of the browser's error page. No data is stored on the device.

## Native-style navigation
Already in place: a bottom tab bar (`nav.tabbar` in `App.tsx`), safe-area padding (`env(safe-area-inset-*)`, `viewport-fit=cover`), and `inputMode="decimal"` on the amount fields.

Still to do:
* **Back behaviour**: the Android back gesture and button, and swiping back from the edge on iOS, must follow the in-app navigation. React Router already pushes history entries. Check that saving a form navigates with `replace`, so going back doesn't reopen the form just saved.
* **Standalone-only styling**: use `@media (display-mode: standalone)` for tweaks that only apply when the app is installed (for example, no browser bar to account for).
* **Touch details**: `-webkit-tap-highlight-color: transparent`, `user-select: none` on the tab bar and buttons (not on data), `overscroll-behavior-y: contain` to avoid the whole page bouncing, and touch targets at least 44×44 px.
* **Fast feedback**: an immediate visual state on press (`:active`), and skeletons or spinners while TanStack Query loads, so taps never feel ignored.
* **Page transitions** (optional): the View Transitions API gives a native-like slide between pages with little code. It degrades gracefully on browsers without support.
* **Install hint**: a one-time "Installa CatZilla" hint in the *Altro* page. On Android it uses the `beforeinstallprompt` event. On iOS it explains *Condividi → Aggiungi alla schermata Home*, because iOS has no install prompt.

# Platform notes

| | Android (Chrome, Edge, Samsung Internet) | iOS / iPadOS (Safari) |
|---|---|---|
| Installation | The browser offers "Installa app", and we can show our own prompt. | Manual only: *Condividi → Aggiungi alla schermata Home*. On iOS, other browsers use the same engine. |
| Appearance | Shown in the app drawer and the app switcher like a native app. | Icon on the home screen, full screen, shown in the app switcher. |
| Session | Shares cookies with Chrome. | The installed app has **its own storage**, separate from Safari: the user logs in again once after installing. |
| Updates | Picked up on the next launch, through the service worker. | Same, but iOS may keep the old version a little longer. |

## Google login inside the installed app
Google login (OIDC, still to be built) redirects to `accounts.google.com` and back. This works in a standalone PWA on both platforms: the login page opens inside the app or in an in-app browser sheet, and returns to the app. When it is implemented:
* Use the full-page **redirect** flow, not a popup. Popups are unreliable in standalone mode.
* Test the whole login from an installed PWA on a real iPhone and a real Android phone. That is where problems usually show up.
* The session cookie must be `Secure` and `SameSite=Lax`, so it is sent back on the redirect from Google.

# Testing

* Installation needs **HTTPS**, except on `localhost`. A phone on the LAN hitting the dev server over `http://` can't install the app.
* Before deployment, test on a phone through an HTTPS tunnel to the Vite dev server (for example `cloudflared tunnel --url http://localhost:5173`, which is free and needs no account). Afterwards, test on the Cloudflare Pages URL.
* Chrome DevTools → *Application* → *Manifest* shows whether the app is installable, and Lighthouse has a PWA check.
* The service worker should be disabled in `npm run dev`, so it doesn't serve stale files during development.

# Later option: an Android APK without the Play Store

If a "real" Android app is wanted later, the PWA can be wrapped in a **Trusted Web Activity** with Bubblewrap or PWABuilder. The result is an APK that opens the deployed site full screen, with no browser bar.

* It's free. The APK can be shared directly (sideloaded), which means the user has to allow "install unknown apps" on their phone.
* The domain must publish a `/.well-known/assetlinks.json` file with the APK's signing key. Otherwise the browser bar is shown.
* It adds little over an installed PWA and has to be rebuilt when the signing key or the domain changes. It is only worth doing if volunteers find installing the PWA confusing.
* If it is published in the Play Store later, the fee is a single payment of 25 USD, not a yearly one.

A native iOS app isn't considered: without an Apple developer account (99 USD a year), there is no practical way to distribute it.

# Not in scope

* Push notifications (they would need Web Push, subscriptions stored on the server, and installation first on iOS).
* Share target, camera or attachments (receipts are out of scope in the requirements).
* Offline data entry and sync.
* Publishing in app stores.
