# Device test

## Landing page check

1. Use Chrome DevTools with the Fast 3G network profile and 4x CPU slowdown.
2. Open `/` in a private tab and start a cold load with the Network panel cache disabled.
3. Measure from navigation until the heading, opening text and Get started link are readable.
4. The landing page should be readable in about 3 seconds, with no horizontal scroll at
   360 CSS pixels or 200% zoom.
5. Run `npm run perf:check`; the lazy landing JavaScript chunk must stay at or below
   15 KB gzip and must not import landlord-only features.
   The current production build measured the landing chunk at 1.75 KB gzip.
