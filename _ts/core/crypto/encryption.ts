import {
	base64ToBuffer,
	bufferToBase64,
	bufferToString,
	stringToBuffer,
} from "./encoding";

/**
 * Generates a fresh and random Data Encryption Key (DEK)
 *
 * @returns {Promise<CryptoKey>} Promise resolving to an extractable AES-GCM key
 */
export async function generateDEK(): Promise<CryptoKey> {
	return await window.crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true, // MUST be extractable so we can wrap it
		["encrypt", "decrypt"],
	);
}

/**
 * Wraps the DEK using the KEK
 *
 * @param dek - Raw Data Encryption Key
 * @param kek - Key Encryption Key
 * @returns {Promise<{ encryptedDekBase64: string; ivBase64: string }>} Promise resolving to base64 strings of the encrypted DEK and IV
 */
export async function wrapDEK(
	dek: CryptoKey,
	kek: CryptoKey,
): Promise<{ encryptedDekBase64: string; ivBase64: string }> {
	// AES-GCM requires a unique 96-bit (12-byte) IV for every encryption
	const iv = window.crypto.getRandomValues(new Uint8Array(12));

	const wrappedDekBuffer = await window.crypto.subtle.wrapKey("raw", dek, kek, {
		name: "AES-GCM",
		iv: iv,
	});

	return {
		encryptedDekBase64: bufferToBase64(wrappedDekBuffer),
		ivBase64: bufferToBase64(iv),
	};
}

/**
 * Unwraps the DEK using the KEK
 *
 * @param encryptedDekBase64 - Wrapped DEK string
 * @param ivBase64 - IV used to wrap the DEK
 * @param kek - Key Encryption Key
 * @returns {Promise<CryptoKey>} Promise resolving to the usable DEK
 */
export async function unwrapDEK(
	encryptedDekBase64: string,
	ivBase64: string,
	kek: CryptoKey,
): Promise<CryptoKey> {
	return await window.crypto.subtle.unwrapKey(
		"raw",
		base64ToBuffer(encryptedDekBase64) as BufferSource,
		kek,
		{ name: "AES-GCM", iv: base64ToBuffer(ivBase64) as BufferSource },
		{ name: "AES-GCM", length: 256 },
		true, // The unwrapped DEK must be extractable if we ever need to re-wrap it
		["encrypt", "decrypt"],
	);
}

/**
 * Encrypts arbitrary text using the DEK
 *
 * @param plaintext - Raw string data to encrypt
 * @param dek - Data Encryption Key
 * @returns {Promise<{ ciphertextBase64: string; ivBase64: string }>} Promise resolving to base64 strings of the ciphertext and unique IV
 */
export async function encryptData(
	plaintext: string,
	dek: CryptoKey,
): Promise<{ ciphertextBase64: string; ivBase64: string }> {
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const encodedData = stringToBuffer(plaintext);

	const ciphertextBuffer = await window.crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		dek,
		encodedData as BufferSource,
	);

	return {
		ciphertextBase64: bufferToBase64(ciphertextBuffer),
		ivBase64: bufferToBase64(iv),
	};
}

/**
 * Decrypts data using the DEK
 *
 * @param ciphertextBase64 - Encrypted string
 * @param ivBase64 - IV used during encryption
 * @param dek - Data Encryption Key
 * @returns {Promise<string>} Promise resolving to the decrypted plaintext string
 */
export async function decryptData(
	ciphertextBase64: string,
	ivBase64: string,
	dek: CryptoKey,
): Promise<string> {
	const decryptedBuffer = await window.crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: base64ToBuffer(ivBase64) as BufferSource },
		dek,
		base64ToBuffer(ciphertextBase64) as BufferSource,
	);

	return bufferToString(decryptedBuffer);
}
