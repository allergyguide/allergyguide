/**
 * Inline SVG icons shared across the OFC index UI
 * Decorative icons carry aria-hidden; the owning control supplies the accessible name
 */
import { html } from "lit-html";

/** Verified brand or provisioned food source */
export const BRAND_ICON = html`
	<svg class="icon icon-brand" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" role="img" aria-label="Verified brand">
		<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
	</svg>
`;

/** Custom user food source */
export const USER_ICON = html`
	<svg class="icon icon-user" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" role="img" aria-label="Custom food">
		<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
	</svg>
`;

/** Close / clear (X) */
export const CLOSE_ICON = html`
	<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
		<path d="M6 6l12 12M18 6L6 18"/>
	</svg>
`;

/** External link (opens in a new tab) */
export const EXTERNAL_ICON = html`
	<svg class="icon icon-external" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>
	</svg>
`;
