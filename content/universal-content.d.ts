/**
 * Universal Content Script for IsshanTV Guardian.
 * Injects into EVERY website (except YouTube — it has its own content script).
 *
 * Scans page URL, title, and visible text against the user's keyword/video/regex
 * blocklists. If ANY match is found, blocks the entire page with an overlay.
 *
 * Layers:
 * 1. Pre-block CSS at document_start — hides ALL content before anything renders
 * 2. URL + title check (immediate, no DOM needed)
 * 3. Visible text scan (after DOMContentLoaded)
 * 4. Full-page block overlay if anything matched
 * 5. SPA navigation detection (pushState, popstate, hashchange)
 * 6. REINITIALIZE on blocklist change
 */
export {};
//# sourceMappingURL=universal-content.d.ts.map