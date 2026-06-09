import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import { authenticateUser, type UserToken } from "./_lib/auth.mts";
import { HttpError } from "./_lib/utils.mts";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
	// Method Check
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: "Method Not Allowed" };
	}

	// Auth Check (Supabase JWT)
	let uuid = "";
	let userEmail = "";
	try {
		const decoded = (await authenticateUser(event)) as UserToken;
		uuid = decoded.uuid;
		userEmail = decoded.email;
	} catch (err) {
		if (err instanceof HttpError) {
			return {
				statusCode: err.statusCode,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: err.message }),
			};
		}
		console.error("Unhandled Auth Error:", err);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Internal Server Error" }),
		};
	}

	// PAYLOAD PARSING
	interface FeedbackPayload {
		subject: string;
		message: string;
		context?: string;
	}
	let payload: FeedbackPayload;
	try {
		payload = JSON.parse(event.body || "{}");
	} catch {
		return { statusCode: 400, body: "Invalid JSON" };
	}

	const { subject, message, context } = payload;

	if (!subject || !message) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Missing subject or message" }),
		};
	}

	// PREPARE EMAIL CONTENT
	const adminEmailContent = `
SUPPORT / FEEDBACK REQUEST
------------------------------------------------
From: ${userEmail}
UUID: ${uuid}
Subject: ${subject}

MESSAGE:
------------------------------------------------
${message}
------------------------------------------------

CONTEXT / TOOL DATA:
${context || "None provided"}
  `;

	const userEmailContent = `
Hello,

We have received your message regarding: "${subject}".

Our team will review your request and get back to you if needed.

Message Summary:
${message}

Best regards,

The allergyguide team
  `;

	// SEND EMAILS
	try {
		const results = await Promise.allSettled([
			// Send to Admin
			resend.emails.send({
				from: "AllergyGuide Support <noreply@allergyguide.ca>",
				to: "allergyguideca@gmail.com",
				subject: `[SUPPORT] ${subject} - ${userEmail}`,
				text: adminEmailContent,
			}),
			// Send to User (Confirmation)
			resend.emails.send({
				from: "AllergyGuide Support <noreply@allergyguide.ca>",
				to: userEmail,
				subject: `Message Received: ${subject}`,
				text: userEmailContent,
			}),
		]);

		const adminResult = results[0];
		if (adminResult.status === "rejected") {
			console.error("Failed to send Admin email:", adminResult.reason);
			throw new Error("Internal delivery error");
		}

		return {
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: "Message sent successfully" }),
		};
	} catch (error) {
		console.error("Critical Email Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Failed to process request." }),
		};
	}
};
