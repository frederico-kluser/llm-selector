# Security policy

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** (Security → Report a vulnerability) rather
than a public issue. Include reproduction steps and the affected version. You can expect an
acknowledgement within a few days.

## Threat model for API keys — read this

SOM is a bring-your-own-key client. The browser has to read your key in order to build an
`Authorization` header, which means **no storage mechanism in the browser can protect a key from a
successful XSS on the origin that serves the app**. The httpOnly-cookie advice does not apply here:
an httpOnly cookie cannot be read by JavaScript to construct a cross-origin header.

What SOM does:

- The key is kept in `sessionStorage` by default (cleared when the tab closes).
- `localStorage` is written **only** when you switch on "Remember this device".
- The key never appears in the URL, in JSON exports, in error messages, or in server logs. The API
  server logs status codes and cache hits only.
- The API never echoes a key back in a response body.
- No telemetry, no analytics, no third-party scripts.

What you should do:

1. Use a dedicated key with a credit limit rather than an account-wide key.
2. Only run SOM on an origin you control (`localhost` by default).
3. If you deploy it, terminate TLS and set a Content-Security-Policy whose `connect-src` allows only
   the hosts SOM actually talks to (`self`, `https://openrouter.ai`, `https://artificialanalysis.ai`).
   That single directive limits what a stolen key could be exfiltrated to.
4. Never put a key in a `VITE_*` environment variable — Vite inlines those into the client bundle.

## Scope

Secrets handling, XSS, and the API proxy's forwarding behaviour are in scope. Abuse of the upstream
providers' services is out of scope and is governed by their terms.
