// _ts/setup-tests.ts
import { webcrypto } from "node:crypto";
import { beforeAll, vi } from "vitest";

// Polyfill WebCrypto API immediately
if (typeof window !== "undefined") {
	Object.defineProperty(window, "crypto", {
		value: webcrypto,
		writable: true,
	});
}

// Mock esbuild injected globals immediately
Object.defineProperty(globalThis, "__SUPABASE_URL__", {
	value: "https://mock-testing-url.supabase.co",
	writable: true,
});

Object.defineProperty(globalThis, "__SUPABASE_PUBLISHABLE_KEY__", {
	value: "mock-publishable-key",
	writable: true,
});

// Polyfill localStorage (not available by default in vitest node env)
if (typeof globalThis.localStorage === "undefined") {
	const mockStorage = {
		store: {} as Record<string, string>,
		getItem(key: string) {
			return this.store[key] || null;
		},
		setItem(key: string, value: string) {
			this.store[key] = String(value);
		},
		removeItem(key: string) {
			delete this.store[key];
		},
		clear() {
			this.store = {};
		},
	};
	Object.defineProperty(globalThis, "localStorage", {
		value: mockStorage,
	});
}

// Polyfill BroadcastChannel (not in JSDOM) immediately
const instances = new Set<any>();
const MockBroadcastChannel = class {
	name: string;
	listeners = new Map<string, Set<any>>();
	constructor(name: string) {
		this.name = name;
		instances.add(this);
	}
	postMessage(data: any) {
		// Simulate message being sent to other instances
		instances.forEach((instance) => {
			if (instance !== this && instance.name === this.name) {
				instance.triggerMessage(data);
			}
		});
	}
	close() {
		instances.delete(this);
	}
	addEventListener(type: string, listener: any) {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type)!.add(listener);
	}
	removeEventListener(type: string, listener: any) {
		this.listeners.get(type)?.delete(listener);
	}
	dispatchEvent(_event: Event) {
		return true;
	}
	triggerMessage(data: any) {
		const messageListeners = this.listeners.get("message");
		if (messageListeners) {
			messageListeners.forEach((l) => {
				l({ data });
			});
		}
	}
};
vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
(globalThis as any).__BROADCAST_CHANNEL_INSTANCES__ = instances;

beforeAll(() => {
	// Hooks can still be used if needed
});
