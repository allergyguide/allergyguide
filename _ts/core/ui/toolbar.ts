import { html, nothing, type TemplateResult } from "lit-html";

export interface CoreToolbarProps {
	isLoggedIn: boolean;
	userEmail: string | null;
	version: string;
	changelogUrl: string;
	onLogin: () => void;
	onLogout: () => void;
	extraContent?: TemplateResult;
	showFeedback?: boolean;
	onFeedback?: () => void;
	customAssetsSyncStatus?: "loading" | "success" | "error";
}

/**
 * Generic toolbar template for tools requiring authentication
 *
 * @param props - Core toolbar properties
 * @returns {TemplateResult} Lit-html template result
 */
export const coreToolbarTemplate = (
	props: CoreToolbarProps,
): TemplateResult => html`
    <div class="core-toolbar">
        <div class="core-toolbar-extra">
            ${
							props.customAssetsSyncStatus
								? html`
                <div class="sync-status sync-status-${props.customAssetsSyncStatus}">
                    ${
											props.customAssetsSyncStatus === "loading"
												? html`<span class="sync-spinner"></span> Loading custom assets...`
												: nothing
										}
                    ${
											props.customAssetsSyncStatus === "success"
												? html`<span class="sync-icon">✓</span> Custom assets loaded!`
												: nothing
										}
                    ${
											props.customAssetsSyncStatus === "error"
												? html`<span class="sync-icon">!</span> Failed to load custom assets. Refresh!`
												: nothing
										}
                </div>
            `
								: nothing
						}
            ${props.extraContent || nothing}
        </div>
        <div class="core-version-auth">
            ${
							props.isLoggedIn
								? html`
                <div class="auth-elements-wrapper">
                    ${
											props.showFeedback
												? html`
                        <button class="login-link-btn" title="Help / Feedback" aria-label="Feedback" @click=${props.onFeedback}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-square-dots feedback-svg" viewBox="0 0 16 16">
                                <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.586l-2.707 2.707A1 1 0 0 1 8 13.414V11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .707.293L7.586 14.586A2 2 0 0 0 11 13.172V12h3a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                                <path d="M5 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                            </svg>
                        </button>
                    `
												: nothing
										}
                    <span class="core-user-badge">${props.userEmail}</span>
                    <button class="login-link-btn" title="Logout" aria-label="Logout" @click=${props.onLogout}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-right" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                            <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
                        </svg>
                    </button>
                </div>
            `
								: html`
                <button class="login-link-btn" title="Login" aria-label="Login" @click=${props.onLogin}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
                        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0"/>
                        <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1"/>
                    </svg>
                </button>
            `
						}
            <span class="separator">|</span>
            <a href="${props.changelogUrl}" target="_blank" rel="noopener noreferrer" class="core-version">
                <span>v${props.version || "0.0.0"}</span>
            </a>
        </div>
    </div>
`;
