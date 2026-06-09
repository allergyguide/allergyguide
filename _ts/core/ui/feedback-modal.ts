import { html, nothing, render } from "lit-html";
import { submitFeedback } from "../api/feedback";

interface FeedbackOptions {
	headerMessage?: string;
	context?: string;
}

let currentOptions: FeedbackOptions = {};
let isSubmitting = false;
let statusMessage = "";
let isSuccess = false;

/**
 * Renders the feedback submission modal
 */
function renderFeedbackModal() {
	let mount = document.getElementById("core-feedback-mount");
	if (!mount) {
		mount = document.createElement("div");
		mount.id = "core-feedback-mount";
		document.body.appendChild(mount);
	}

	render(feedbackTemplate(), mount);
}

const feedbackTemplate = () => html`
	<div class="core-modal-overlay" @click=${hideFeedbackModal}>
		<div class="core-modal-content core-modal-sm" @click=${(e: Event) => e.stopPropagation()}>
			<div class="core-modal-header">
				<h2>Help & Feedback</h2>
				<button class="core-modal-close" @click=${hideFeedbackModal}>×</button>
			</div>

			${
				currentOptions.headerMessage
					? html`<p class="subtle-text">${currentOptions.headerMessage}</p>`
					: html`<p class="subtle-text">Have a question, found a bug, or have a suggestion? Let us know!</p>`
			}

			${
				isSuccess
					? html`
				<div class="core-success-banner">
					<div class="success-icon">✓</div>
					<h3>Message Sent!</h3>
					<p>We have received your message.</p>
					<button class="core-btn core-btn-primary" @click=${hideFeedbackModal}>Close</button>
				</div>
			`
					: html`
				<form class="core-feedback-form" @submit=${handleFeedbackSubmit}>
					<div class="core-form-group">
						<label>Subject</label>
						<select id="feedback-subject" class="core-input" required ?disabled=${isSubmitting}>
							<option value="General Feedback">General Feedback</option>
							<option value="Bug Report">Bug Report</option>
							<option value="Feature Request">Feature Request</option>
							<option value="Help / Support">Help / Support</option>
						</select>
					</div>

					<div class="core-form-group">
						<label>Message</label>
						<textarea 
							id="feedback-message" 
							class="core-input" 
							rows="5" 
							required 
							placeholder="Tell us what's on your mind..."
							?disabled=${isSubmitting}
						></textarea>
					</div>

					${
						statusMessage
							? html`<div class="core-error-message" style="margin-bottom: 1rem;">${statusMessage}</div>`
							: nothing
					}

					<div class="core-auth-modal-buttons">
						<button type="button" class="core-btn core-btn-secondary" @click=${hideFeedbackModal} ?disabled=${isSubmitting}>Cancel</button>
						<button type="submit" class="core-btn core-btn-primary" ?disabled=${isSubmitting}>
							${isSubmitting ? "Sending..." : "Send Message"}
						</button>
					</div>
				</form>
			`
			}
		</div>
	</div>
`;

async function handleFeedbackSubmit(e: Event) {
	e.preventDefault();
	const subject = (
		document.getElementById("feedback-subject") as HTMLSelectElement
	).value;
	const message = (
		document.getElementById("feedback-message") as HTMLTextAreaElement
	).value;

	isSubmitting = true;
	statusMessage = "";
	renderFeedbackModal();

	try {
		await submitFeedback(subject, message, currentOptions.context);
		isSuccess = true;
	} catch (err) {
		statusMessage =
			err instanceof Error ? err.message : "Failed to send message.";
	} finally {
		isSubmitting = false;
		renderFeedbackModal();
	}
}

/**
 * Public method to show the feedback modal
 */
export function showFeedbackModal(options: FeedbackOptions = {}) {
	currentOptions = options;
	isSubmitting = false;
	statusMessage = "";
	isSuccess = false;
	document.body.style.overflow = "hidden";
	renderFeedbackModal();

	// Focus message field
	setTimeout(() => {
		const msg = document.getElementById("feedback-message");
		if (msg) msg.focus();
	}, 0);
}

/**
 * Public method to hide the feedback modal
 */
export function hideFeedbackModal() {
	const mount = document.getElementById("core-feedback-mount");
	if (mount) {
		render(nothing, mount);
	}
	document.body.style.overflow = "";
}

// Global key listener for ESC
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		const mount = document.getElementById("core-feedback-mount");
		if (mount && mount.innerHTML !== "") {
			hideFeedbackModal();
		}
	}
});
