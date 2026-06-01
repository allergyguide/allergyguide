// _ts/core/tests/db.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import { getActiveDEK } from "../auth/login-client";
import { decryptData, encryptData } from "../crypto/encryption";
import {
	deleteSupaDocument,
	fetchSingleSupaDocument,
	fetchSupaDocuments,
	saveSupaDocument,
} from "../data/db";

// Mock Supabase
vi.mock("../api/supabase", () => ({
	supabase: {
		from: vi.fn(() => ({
			upsert: vi.fn(),
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(),
				})),
			})),
			delete: vi.fn(() => ({
				eq: vi.fn(),
			})),
		})),
	},
}));

// Mock login-client
vi.mock("../auth/login-client", () => ({
	getActiveDEK: vi.fn(),
}));

// Mock crypto/encryption to simplify verify data flow
vi.mock("../crypto/encryption", () => ({
	encryptData: vi.fn(),
	decryptData: vi.fn(),
}));

describe("Data Module: Database", () => {
	const mockDek = { type: "secret" } as any;

	beforeEach(() => {
		vi.clearAllMocks();
		(getActiveDEK as any).mockReturnValue(mockDek);
	});

	describe("saveocument", () => {
		it("should serialize, encrypt and upsert document", async () => {
			const id = "doc-123";
			const docType = "protocol";
			const payload = { foo: "bar" };

			(encryptData as any).mockResolvedValue({
				ciphertextBase64: "encrypted-blob",
				ivBase64: "iv-123",
			});

			const mockUpsert = vi.fn().mockResolvedValue({ error: null });
			(supabase.from as any).mockReturnValue({ upsert: mockUpsert });

			await saveSupaDocument(id, docType, payload);

			expect(getActiveDEK).toHaveBeenCalled();
			expect(encryptData).toHaveBeenCalledWith(
				JSON.stringify(payload),
				mockDek,
			);
			expect(mockUpsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id,
					doc_type: docType,
					encrypted_blob: "encrypted-blob",
					iv: "iv-123",
				}),
			);
		});
	});

	describe("fetchocuments", () => {
		it("should fetch, decrypt and return documents", async () => {
			const docType = "protocol";
			const mockRows = [
				{
					id: "1",
					encrypted_blob: "blob1",
					iv: "iv1",
					created_at: "t1",
					updated_at: "u1",
				},
			];

			const mockEq = vi.fn().mockResolvedValue({ data: mockRows, error: null });
			const mockSelect = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			(decryptData as any).mockResolvedValue(
				JSON.stringify({ data: "decrypted" }),
			);

			const docs = await fetchSupaDocuments(docType);

			expect(docs).toHaveLength(1);
			expect(docs[0].data).toEqual({ data: "decrypted" });
			expect(decryptData).toHaveBeenCalledWith("blob1", "iv1", mockDek);
		});

		it("should filter out documents that fail to decrypt", async () => {
			const mockRows = [
				{ id: "good", encrypted_blob: "ok", iv: "iv1" },
				{ id: "bad", encrypted_blob: "fail", iv: "iv2" },
			];

			const mockEq = vi.fn().mockResolvedValue({ data: mockRows, error: null });
			const mockSelect = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			(decryptData as any).mockImplementation(async (blob: string) => {
				if (blob === "ok") return JSON.stringify({ ok: true });
				throw new Error("Decryption failed");
			});

			const docs = await fetchSupaDocuments("type");

			expect(docs).toHaveLength(1);
			expect(docs[0].id).toBe("good");
		});

		it("should throw if database fetch fails", async () => {
			const mockSelect = vi.fn(() => ({
				eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
			}));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			await expect(fetchSupaDocuments("type")).rejects.toThrow(
				"Failed to fetch type records.",
			);
		});
	});

	describe("fetchSingleocument", () => {
		it("should fetch and decrypt a single document", async () => {
			const id = "doc-1";
			const mockRow = { id, encrypted_blob: "blob", iv: "iv" };
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: mockRow, error: null });
			const mockEq = vi.fn(() => ({ single: mockSingle }));
			const mockSelect = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			(decryptData as any).mockResolvedValue(JSON.stringify({ ok: true }));

			const doc = await fetchSingleSupaDocument(id);
			expect(doc?.data).toEqual({ ok: true });
		});

		it("should return null if decryption fails", async () => {
			const mockRow = { id: "1", encrypted_blob: "blob", iv: "iv" };
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: mockRow, error: null });
			(supabase.from as any).mockReturnValue({
				select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockSingle })) })),
			});

			(decryptData as any).mockRejectedValue(new Error("Fail"));

			const doc = await fetchSingleSupaDocument("1");
			expect(doc).toBeNull();
		});

		it("should return null if not found", async () => {
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
			const mockEq = vi.fn(() => ({ single: mockSingle }));
			const mockSelect = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			const doc = await fetchSingleSupaDocument("missing");
			expect(doc).toBeNull();
		});
	});

	describe("saveocument", () => {
		it("should throw if upsert fails", async () => {
			(encryptData as any).mockResolvedValue({
				ciphertextBase64: "c",
				ivBase64: "i",
			});
			const mockUpsert = vi
				.fn()
				.mockResolvedValue({ error: { message: "fail" } });
			(supabase.from as any).mockReturnValue({ upsert: mockUpsert });

			await expect(saveSupaDocument("id", "type", {})).rejects.toThrow(
				"Database save failed.",
			);
		});
	});

	describe("deleteocument", () => {
		it("should call delete on supabase", async () => {
			const id = "doc-to-delete";
			const mockEq = vi.fn().mockResolvedValue({ error: null });
			const mockDelete = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ delete: mockDelete });

			await deleteSupaDocument(id);

			expect(supabase.from).toHaveBeenCalledWith("user_documents");
			expect(mockEq).toHaveBeenCalledWith("id", id);
		});

		it("should throw if delete fails", async () => {
			const mockEq = vi.fn().mockResolvedValue({ error: { message: "Fail" } });
			(supabase.from as any).mockReturnValue({
				delete: vi.fn(() => ({ eq: mockEq })),
			});

			await expect(deleteSupaDocument("1")).rejects.toThrow(
				"Database delete failed.",
			);
		});
	});
});
