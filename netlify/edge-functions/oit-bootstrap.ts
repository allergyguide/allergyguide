import type { Context } from "@netlify/edge-functions";
import { authenticateUser } from "./_lib/auth.ts";
import { getBlobStore } from "./_lib/store.ts";
import { HttpError, normalizeBlobKey } from "./_lib/utils.ts";

export default async (req: Request, context: Context) => {
	// Catch any warmup ping early
	if (req.headers.get("x-warmup") === "true") {
		// Do a dummy call to Supabase just to open the TLS connection
		// fetch a public endpoint on Supabase instead to open connection
		try {
			const supabaseUrl = Netlify.env.get("SUPABASE_URL");
			if (supabaseUrl) {
				fetch(`${supabaseUrl}/rest/v1/`, { method: "HEAD" }).catch(() => {});
			}

			// Do a dummy blob read to open the Blob Storage TLS connection
			const store = getBlobStore();
			store.get("dummy-key").catch(() => {});

			return new Response("warmed", { status: 200 });
		} catch (e) {
			console.error("warmup oit-bootstrap ping failed: ", e);
		}
	}

	try {
		const decoded = await authenticateUser(req, context);
		const uuid = decoded.uuid;

		const store = getBlobStore();

		const configPath = `user_configs/${uuid}_config.json`;
		let configRaw: string | null;
		try {
			configRaw = await store.get(configPath, { type: "text" });
		} catch {
			configRaw = null;
		}

		if (!configRaw) {
			throw new HttpError("Forbidden: User configuration not found", 403);
		}
		const userConfig = JSON.parse(configRaw);

		if (!userConfig.tools?.oit_calculator) {
			console.warn(`User ${uuid} logged in but lacks oit_calculator config.`);
			throw new HttpError("Forbidden: No OIT Configuration found", 403);
		}

		const oitConfig = userConfig.tools.oit_calculator;

		const readSecureFiles = async (paths: string[] | undefined) => {
			if (!Array.isArray(paths) || paths.length === 0) return [];

			const results = await Promise.all(
				paths.map(async (p) => {
					if (!p) return [];

					try {
						const parsed = await store.get(normalizeBlobKey(p), {
							type: "json",
						});
						if (!parsed) return []; // Key doesn't exist in the store

						if (
							parsed &&
							typeof parsed === "object" &&
							!Array.isArray(parsed) &&
							parsed.metadata &&
							"schema_version" in parsed.metadata &&
							Array.isArray(parsed.data)
						) {
							return parsed.data;
						}

						return parsed;
					} catch (e) {
						console.error(`Failed to load asset ${p} for ${uuid}:`, e);
						return [];
					}
				}),
			);
			return results.flat();
		};

		const [provisioned_foods, provisioned_protocols] = await Promise.all([
			readSecureFiles(oitConfig.provisioned_foods),
			readSecureFiles(oitConfig.provisioned_protocols),
		]);

		const responseData = {
			uuid: uuid,
			email: decoded.email,
			provisioned_foods: provisioned_foods,
			provisioned_protocols: provisioned_protocols,
			handouts: oitConfig.handouts || [],
		};

		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "private, no-cache, no-store, must-revalidate",
			},
		});
	} catch (err) {
		if (err instanceof HttpError) {
			return new Response(JSON.stringify({ message: err.message }), {
				status: err.statusCode,
				headers: { "Content-Type": "application/json" },
			});
		} else {
			console.error(
				"Unhandled Server Error during OIT calculator bootstrap:",
				err,
			);
			return new Response(JSON.stringify({ message: "Bootstrap failed" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	}
};
