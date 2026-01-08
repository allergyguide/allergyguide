import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
  // Method Check
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Auth Check (JWT)
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nf_jwt;
  if (!token) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Unauthorized: No session found" })
    };
  }

  // VERIFY JWT AND GET USER
  let username = "";
  try {
    if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { user: string };
    username = decoded.user;
  } catch (err) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Forbidden: Session expired or invalid" })
    };
  }

  // PAYLOAD PARSING & VALIDATION
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { protocolData, protocolName, userEmail, context, ascii } = payload;

  // ensure we have the minimum data needed
  // TODO! consider zod validation, though if it is validated beforehand client side, is there a point?
  if (!protocolData || !protocolName || !userEmail) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing required fields" }) };
  }

  // PREPARE EMAIL CONTENT
  // EMAIL TO ADMIN 
  const adminEmailContent = `
PROTOCOL SAVE REQUEST
------------------------------------------------
User: ${username}
User Email: ${userEmail}
Protocol Name: ${protocolName}
Context: ${context || "None provided"}

ASCII PREVIEW:
${ascii}

------------------------------------------------
JSON DATA:
${JSON.stringify(protocolData)}
------------------------------------------------
  `;

  // Confirmation Email to User
  const userEmailContent = `
Hello,

We have received your request to save the protocol: "${protocolName}".

Our team will review this request. Standard turnaround time at this time is 3-5 business days. 

Protocol Summary:
${ascii}


Best regards,

The allergyguide team
  `;

  // SEND EMAILS (PARALLEL)
  try {
    // We use allSettled so one failure doesn't crash the other
    const results = await Promise.allSettled([
      // Send to Admin
      resend.emails.send({
        from: 'OIT Calculator <noreply@allergyguide.ca>', // Ensure this domain is verified in Resend
        to: 'allergyguideca@gmail.com',
        subject: `SAVE OIT-PROTOCOL REQ: ${protocolName} - ${username}`,
        text: adminEmailContent,
      }),
      // Send to User
      resend.emails.send({
        from: 'OIT Calculator <noreply@allergyguide.ca>',
        to: userEmail,
        subject: `Request Received: ${protocolName}`,
        text: userEmailContent,
      })
    ]);

    // Check results
    const adminResult = results[0];
    const userResult = results[1];

    if (adminResult.status === 'rejected') {
      console.error("Failed to send Admin email:", adminResult.reason);
      // If admin email fails that's not great
      throw new Error("Internal delivery error");
    }

    if (userResult.status === 'rejected') {
      // If user email fails, we log it but still consider the operation "successful" 
      console.warn("Failed to send User confirmation email:", userResult.reason);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Request sent successfully" }),
    };

  } catch (error) {
    console.error("Critical Email Error:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Failed to process request." }),
    };
  }
};
