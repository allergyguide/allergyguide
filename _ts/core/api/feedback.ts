import { supabase } from "./supabase";

/**
 * Submits feedback or a bug report to the serverless function
 *
 * @param subject - subject of the email (e.g., "Bug Report", "Help")
 * @param message - main body of the message
 * @param context - optional additional technical context or metadata
 */
export async function submitFeedback(
	subject: string,
	message: string,
	context?: string,
): Promise<void> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		throw new Error("You must be logged in to send feedback.");
	}

	const response = await fetch("/.netlify/functions/submit-email", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${session.access_token}`,
		},
		body: JSON.stringify({
			subject,
			message,
			context,
		}),
	});

	if (!response.ok) {
		const errData = await response.json().catch(() => ({}));
		throw new Error(errData.message || "Failed to send message.");
	}
}
