// _ts/core/tests/tab-sync.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestDekFromTabs } from "../auth/tab-sync";
import { DEK_STORAGE_KEY, VAULT_SYNC_CHANNEL } from "../constants";

describe("Auth Module: Tab Sync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
	});

	it("requestDekFromTabs should resolve false on timeout", async () => {
		vi.useFakeTimers();

		const promise = requestDekFromTabs(100);
		vi.advanceTimersByTime(150);

		const result = await promise;
		expect(result).toBe(false);

		vi.useRealTimers();
	});

	it("requestDekFromTabs should resolve true if PROVIDE_DEK is received via BroadcastChannel", async () => {
		// Since tab-sync.ts creates a BroadcastChannel instance at module level, it's already in globalInstances set
		const instances = (globalThis as any).__BROADCAST_CHANNEL_INSTANCES__;
		const appInstance = Array.from(instances).find(
			(i: any) => i.name === VAULT_SYNC_CHANNEL,
		);

		expect(appInstance).toBeDefined();

		const promise = requestDekFromTabs(1000);

		// Simulate another tab providing the DEK
		const dummyDek = "dummy-dek-base64";
		(appInstance as any).triggerMessage({
			type: "PROVIDE_DEK",
			payload: dummyDek,
		});

		const result = await promise;
		expect(result).toBe(true);
		expect(sessionStorage.getItem(DEK_STORAGE_KEY)).toBe(dummyDek);
	});

	it("should respond to REQUEST_DEK if it has the DEK", async () => {
		const instances = (globalThis as any).__BROADCAST_CHANNEL_INSTANCES__;
		const appInstance = Array.from(instances).find(
			(i: any) => i.name === VAULT_SYNC_CHANNEL,
		) as any;

		const postMessageSpy = vi.spyOn(appInstance, "postMessage");

		const dummyDek = "stored-dek";
		sessionStorage.setItem(DEK_STORAGE_KEY, dummyDek);

		// Simulate a request from another tab
		appInstance.triggerMessage({ type: "REQUEST_DEK" });

		expect(postMessageSpy).toHaveBeenCalledWith({
			type: "PROVIDE_DEK",
			payload: dummyDek,
		});
	});
});
