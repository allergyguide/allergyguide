// _ts/core/tests/crypto.test.ts

import { beforeAll, describe, expect, it } from "vitest";
import { deriveAuthHash, deriveKEK } from "../crypto/derivation";
import {
	base64ToBuffer,
	bufferToBase64,
	bufferToHex,
	bufferToString,
	hexToBuffer,
	stringToBuffer,
} from "../crypto/encoding";
import {
	decryptData,
	encryptData,
	generateDEK,
	unwrapDEK,
	wrapDEK,
} from "../crypto/encryption";

describe("Crypto Module: Encoding", () => {
	it("should convert strings to buffers and back", () => {
		const original = "hello world! 123";
		const buffer = stringToBuffer(original);
		const result = bufferToString(buffer);

		expect(result).toBe(original);
		expect(buffer.constructor.name).toBe("Uint8Array");
		expect(buffer.length).toBeGreaterThan(0);
	});

	it("should convert buffers to base64 and back", () => {
		const originalString = "test base64 conversion";
		const buffer = stringToBuffer(originalString);

		const base64 = bufferToBase64(buffer);
		expect(typeof base64).toBe("string");
		expect(base64.length).toBeGreaterThan(0);

		const decodedBuffer = base64ToBuffer(base64);
		expect(bufferToString(decodedBuffer)).toBe(originalString);
	});

	it("should convert buffers to hex and back", () => {
		const originalString = "test hex conversion 123";
		const buffer = stringToBuffer(originalString);

		const hex = bufferToHex(buffer);
		expect(typeof hex).toBe("string");
		expect(/^[0-9a-f]+$/i.test(hex)).toBe(true);

		const decodedBuffer = hexToBuffer(hex);
		expect(bufferToString(decodedBuffer)).toBe(originalString);
	});

	it("should throw error on invalid hex string", () => {
		expect(() => hexToBuffer("123")).toThrow("Invalid hex string");
	});
});

describe("Crypto Module: Key Derivation", () => {
	const password = "my_secure_password_123!";
	const authSaltHex = "a1b2c3d4e5f60718293a4b5c6d7e8f90"; // 16 bytes in hex
	const kekSaltHex = "09f8e7d6c5b4a39281706f5e4d3c2b1a";

	it("should derive deterministic auth hash", async () => {
		const hash1 = await deriveAuthHash(password, authSaltHex);
		const hash2 = await deriveAuthHash(password, authSaltHex);

		expect(typeof hash1).toBe("string");
		expect(hash1.length).toBeGreaterThan(0);
		expect(hash1).toBe(hash2);
	});

	it("should derive different hashes for different salts", async () => {
		const hash1 = await deriveAuthHash(password, authSaltHex);
		const hash2 = await deriveAuthHash(password, kekSaltHex);

		expect(hash1).not.toBe(hash2);
	});

	it("should derive different hashes for different passwords", async () => {
		const hash1 = await deriveAuthHash(password, authSaltHex);
		const hash2 = await deriveAuthHash("different_password", authSaltHex);

		expect(hash1).not.toBe(hash2);
	});

	it("should derive an AES-GCM KEK CryptoKey", async () => {
		const kek = await deriveKEK(password, kekSaltHex);

		expect(kek.type).toBe("secret");
		expect(kek.algorithm.name).toBe("AES-GCM");
		expect(kek.extractable).toBe(false);
		expect(kek.usages).toContain("wrapKey");
		expect(kek.usages).toContain("unwrapKey");
	});
});

describe("Crypto Module: Encryption & Decryption", () => {
	const password = "my_secure_password_123!";
	const kekSaltHex = "09f8e7d6c5b4a39281706f5e4d3c2b1a";

	let kek: CryptoKey;
	let dek: CryptoKey;

	beforeAll(async () => {
		kek = await deriveKEK(password, kekSaltHex);
		dek = await generateDEK();
	});

	it("should generate an extractable DEK", () => {
		expect(dek.type).toBe("secret");
		expect(dek.algorithm.name).toBe("AES-GCM");
		expect(dek.extractable).toBe(true);
		expect(dek.usages).toContain("encrypt");
		expect(dek.usages).toContain("decrypt");
	});

	it("should wrap and unwrap the DEK successfully", async () => {
		// 1. Wrap DEK
		const { encryptedDekBase64, ivBase64 } = await wrapDEK(dek, kek);

		expect(typeof encryptedDekBase64).toBe("string");
		expect(typeof ivBase64).toBe("string");
		expect(encryptedDekBase64.length).toBeGreaterThan(0);
		expect(ivBase64.length).toBeGreaterThan(0);

		// 2. Unwrap DEK
		const unwrappedDek = await unwrapDEK(encryptedDekBase64, ivBase64, kek);

		expect(unwrappedDek.type).toBe("secret");
		expect(unwrappedDek.algorithm.name).toBe("AES-GCM");
		expect(unwrappedDek.extractable).toBe(true);
	});

	it("should fail to unwrap DEK with wrong KEK", async () => {
		const wrongKek = await deriveKEK("wrong_password", kekSaltHex);
		const { encryptedDekBase64, ivBase64 } = await wrapDEK(dek, kek);

		await expect(
			unwrapDEK(encryptedDekBase64, ivBase64, wrongKek),
		).rejects.toThrow();
	});

	it("should encrypt and decrypt string data successfully", async () => {
		const plaintext = JSON.stringify({ message: "Hello, Patient!", id: 123 });

		// 1. Encrypt
		const { ciphertextBase64, ivBase64 } = await encryptData(plaintext, dek);

		expect(ciphertextBase64).not.toBe(plaintext);
		expect(typeof ciphertextBase64).toBe("string");
		expect(typeof ivBase64).toBe("string");

		// 2. Decrypt
		const decryptedText = await decryptData(ciphertextBase64, ivBase64, dek);

		expect(decryptedText).toBe(plaintext);
	});

	it("should fail to decrypt data with wrong DEK", async () => {
		const plaintext = "Secret Medical Info";
		const { ciphertextBase64, ivBase64 } = await encryptData(plaintext, dek);

		const wrongDek = await generateDEK();

		await expect(
			decryptData(ciphertextBase64, ivBase64, wrongDek),
		).rejects.toThrow();
	});

	it("should correctly combine all operations", async () => {
		const secretMessage = "End to end test!";

		// Phase 1: Wrap & store DEK
		const { encryptedDekBase64: storedDek, ivBase64: dekIv } = await wrapDEK(
			dek,
			kek,
		);

		// Phase 2: User encrypts a document
		const { ciphertextBase64: storedDoc, ivBase64: docIv } = await encryptData(
			secretMessage,
			dek,
		);

		// Phase 3: Sometime later, user logs back in and restores KEK
		const restoredKek = await deriveKEK(password, kekSaltHex);

		// Phase 4: Unwrap DEK
		const restoredDek = await unwrapDEK(storedDek, dekIv, restoredKek);

		// Phase 5: Decrypt document
		const recoveredMessage = await decryptData(storedDoc, docIv, restoredDek);

		expect(recoveredMessage).toBe(secretMessage);
	});
});
