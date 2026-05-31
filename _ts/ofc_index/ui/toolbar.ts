/**
 * UI component for the top toolbar, containing version info and authentication controls
 */
import { html, type TemplateResult } from "lit-html";
import { logout } from "../data/auth";
import type { OfcState } from "../types";
import { showLoginModal } from "./login-modal";

/** Build-time injected version string */
declare const __VERSION_OFC_INDEX__: string;

/**
 * Template for the application toolbar
 * Handles login trigger and logout orchestration
 *
 * @param state - Current application state
 * @returns {TemplateResult} The toolbar template result
 */
export const toolbarTemplate = (state: OfcState): TemplateResult => {
	const onLogout = async () => {
		if (confirm("Are you sure you want to log out?")) {
			await logout();
			window.location.reload();
		}
	};

	const changelogLink =
		(
			document.querySelector(
				".ofc-skeleton-container .changelog-link",
			) as HTMLAnchorElement
		)?.href || "#";

	return html`
    <div class="ofc-toolbar">
        <div class="ofc-version-auth">
            ${
							state.isLoggedIn
								? html`
                <span class="ofc-user-badge">${state.username}</span>
                <button class="login-link-btn" title="Logout" aria-label="Logout" @click=${onLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-right" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                        <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
                    </svg>
                </button>
            `
								: html`
                <button class="login-link-btn" title="Login" aria-label="Login" @click=${showLoginModal}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
                        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                        <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
                    </svg>
                </button>
            `
						}
            <span class="separator">|</span>
            <a href="${changelogLink}" target="_blank" rel="noopener noreferrer" class="changelog-link">
                <span class="ofc-version">v${
									__VERSION_OFC_INDEX__ || "0.0.0"
								}</span>
            </a>
        </div>
    </div>
    `;
};
