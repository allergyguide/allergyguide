import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOFCBootstrap } from "../data/api";
import { handleUserLoad } from "../data/loader";
import { FoodType, HttpError, SourceType } from "../types";

vi.mock("../data/api", () => ({ fetchOFCBootstrap: vi.fn() }));

const food = (name: string, extra: Record<string, unknown> = {}) => ({
	name,
	type: FoodType.SOLID,
	gramsInServing: 10,
	servingSize: 100,
	source: SourceType.BRAND,
	...extra,
});

describe("handleUserLoad", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("keeps active non-capsule foods and drops inactive, capsule and invalid entries", async () => {
		vi.mocked(fetchOFCBootstrap).mockResolvedValue({
			uuid: "u1",
			email: "user@example.com",
			provisioned_foods: [
				food("Kept"),
				food("Inactive", { is_active: false }),
				food("Capsule", { type: FoodType.CAPSULE }),
				{ name: "Invalid, no protein" },
			],
		});

		const result = await handleUserLoad();
		expect(result.email).toBe("user@example.com");
		expect(result.foods.map((f) => f.name)).toEqual(["Kept"]);
		expect(result.foods[0].source).toBe(SourceType.BRAND);
		expect(result.foods[0].group).toBe("Unknown");
	});

	it("lets HTTP errors through so the caller can explain them", async () => {
		vi.mocked(fetchOFCBootstrap).mockRejectedValue(
			new HttpError("Forbidden", 403),
		);
		await expect(handleUserLoad()).rejects.toMatchObject({ statusCode: 403 });
	});

	it("throws 401 when there is no session", async () => {
		vi.mocked(fetchOFCBootstrap).mockResolvedValue(null);
		await expect(handleUserLoad()).rejects.toMatchObject({ statusCode: 401 });
	});
});
