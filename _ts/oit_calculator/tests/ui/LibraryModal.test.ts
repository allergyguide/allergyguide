import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../ui/actions/vaultActions", () => ({
	deleteUserDocument: vi.fn(),
}));

import { appState, initializeAppState } from "../../state/instances";
import { FoodType, SourceType } from "../../types";
import { deleteUserDocument } from "../../ui/actions/vaultActions";
import { showLibraryModal } from "../../ui/components/LibraryModal";

const food = {
	id: "food-1",
	name: "Peanut",
	type: FoodType.SOLID,
	gramsInServing: 10,
	servingSize: 100,
	source: SourceType.USER,
};

const click = (mount: HTMLElement, selector: string) =>
	(mount.querySelector(selector) as HTMLButtonElement).click();

describe("LibraryModal: delete in progress", () => {
	let mount: HTMLElement;

	beforeEach(() => {
		if (!appState) {
			initializeAppState({ foods: [], protocols: [] }, "https://example.com");
		}
		appState.setUserData([food as any], []);
		mount = document.createElement("div");
		mount.id = "oit-library-modal-mount";
		document.body.appendChild(mount);
		showLibraryModal();
	});

	afterEach(() => {
		document.body.removeChild(mount);
		document.body.style.overflow = "";
	});

	it("shimmers the row and disables its buttons until the delete finishes", async () => {
		let finish = () => {};
		vi.mocked(deleteUserDocument).mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finish = () => {
						appState.deleteUserFood("food-1");
						resolve();
					};
				}),
		);

		click(mount, ".delete-btn");
		click(mount, ".confirm-btn");

		const row = mount.querySelector(".oit-library-item");
		const confirm = mount.querySelector(".confirm-btn") as HTMLButtonElement;
		expect(row?.classList.contains("is-deleting")).toBe(true);
		expect(confirm.disabled).toBe(true);
		expect(confirm.textContent?.trim()).toBe("Deleting…");

		finish();
		await vi.waitFor(() =>
			expect(mount.querySelector(".oit-library-item")).toBeNull(),
		);
	});

	it("restores the row if the delete fails", async () => {
		vi.spyOn(window, "alert").mockImplementation(() => {});
		vi.mocked(deleteUserDocument).mockRejectedValue(new Error("offline"));

		click(mount, ".delete-btn");
		click(mount, ".confirm-btn");

		await vi.waitFor(() =>
			expect(
				mount
					.querySelector(".oit-library-item")
					?.classList.contains("is-deleting"),
			).toBe(false),
		);
		expect(window.alert).toHaveBeenCalled();
		expect((mount.querySelector(".confirm-btn") as HTMLButtonElement).disabled).toBe(false);
	});
});
