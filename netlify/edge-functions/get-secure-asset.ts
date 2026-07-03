import type { Context } from "@netlify/edge-functions";
import { authenticateUser } from "./_lib/auth.ts";
import { getBlobStore } from "./_lib/store.ts";
import { getAllFilePaths, HttpError } from "./_lib/utils.ts";

export default async (req: Request, context: Context) => {
	let uuid = "";

	try {
		const decoded = await authenticateUser(req, context);
		uuid = decoded.uuid;
	} catch (err) {
		if (err instanceof HttpError) {
			return new Response(JSON.stringify({ message: err.message }), {
				status: err.statusCode,
				headers: { "Content-Type": "application/json" },
			});
		} else {
			console.error("Unhandled Server Error:", err);
			return new Response(
				JSON.stringify({ message: "Internal Server Error" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	const url = new URL(req.url);
	let filename = url.searchParams.get("file");
	if (!filename || filename.includes("..") || filename.includes("\\")) {
		return new Response(JSON.stringify({ message: "Invalid filename" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	filename = filename.replace(/\/\/+/g, "/").replace(/^\//, "");

	if (filename === "me.json") {
		filename = `user_configs/${uuid}_config.json`;
	}

	const store = getBlobStore();
	let hasAccess = false;

	if (filename === `user_configs/${uuid}_config.json`) {
		hasAccess = true;
	} else {
		let permissions: string[] = [];
		try {
			const configPath = `user_configs/${uuid}_config.json`;
			const configRaw = await store.get(configPath, { type: "text" });
			if (!configRaw) throw new Error("Config blob not found");
			const userConfig = JSON.parse(configRaw);

			permissions = Array.from(getAllFilePaths(userConfig));

			if (permissions.includes(filename)) {
				hasAccess = true;
			}
		} catch (e) {
			console.error(`Could not load config for ${uuid} during login:`, e);
			return new Response(
				JSON.stringify({
					message: `Could not load config for ${uuid} during login.`,
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (!hasAccess) {
			console.log(`User ${uuid} denied access to ${filename}`);
			return new Response(
				JSON.stringify({ message: "Forbidden: Access Denied" }),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	try {
		const extMatch = filename.split(".");
		const ext = extMatch.length > 1 ? extMatch.pop()?.toLowerCase() : "";
		const contentTypes: Record<string, string> = {
			pdf: "application/pdf",
			json: "application/json",
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			svg: "image/svg+xml",
			typ: "application/octet-stream",
		};
		const contentType = contentTypes[ext || ""] || "application/octet-stream";
		let cacheControl = "private, no-cache, no-store, must-revalidate"; // Default

		if (ext === "pdf") {
			cacheControl = "private, max-age=3600";
		}

		const blob = await store.get(filename, { type: "blob" });
		if (!blob) {
			return new Response(JSON.stringify({ message: "File not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(blob, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `inline; filename="${filename.split("/").pop()}"`,
				"Cache-Control": cacheControl,
			},
		});
	} catch (err) {
		console.error(`Error serving file ${filename}:`, err);
		return new Response(JSON.stringify({ message: "Internal Server Error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
