import { PBKDF2_ITERATIONS } from "../constants";
import { bufferToBase64, hexToBuffer, stringToBuffer } from "./encoding";

/**
 * Imports plaintext password into the WebCrypto API to create base key material for PBKDF2
 *
 * @param password - Plaintext password
 * @returns {Promise<CryptoKey>} Promise resolving to the base key material
 */
async function importPassword(password: string): Promise<CryptoKey> {
	return await window.crypto.subtle.importKey(
		"raw",
		stringToBuffer(password) as BufferSource,
		{ name: "PBKDF2" },
		false, // Not extractable
		["deriveBits", "deriveKey"],
	);
}

/**
 * Derives the authentication hash sent to Supabase as the user's login password
 *
 * @param password - Plaintext user password
 * @param authSaltHex - Auth salt fetched from the database in hex format
 * @returns {Promise<string>} Promise resolving to a base64 string representing the derived hash
 */
export async function deriveAuthHash(
	password: string,
	authSaltHex: string,
): Promise<string> {
	const keyMaterial = await importPassword(password);

	// deriveBits returns raw mathematical entropy (an ArrayBuffer)
	const derivedBits = await window.crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: hexToBuffer(authSaltHex) as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		256, // 256 bits (32 bytes) of entropy
	);

	// Convert the raw buffer to a Base64 string so we can send it via JSON to Supabase
	return bufferToBase64(derivedBits);
}

/**
 * Derives the Key Encryption Key (KEK) used strictly to wrap and unwrap the DEK
 *
 * @param password - Plaintext user password
 * @param kekSaltHex - KEK salt fetched from the database in hex format
 * @returns {Promise<CryptoKey>} Promise resolving to a CryptoKey configured for AES-GCM operations
 */
export async function deriveKEK(
	password: string,
	kekSaltHex: string,
): Promise<CryptoKey> {
	const keyMaterial = await importPassword(password);

	// deriveKey returns a functional cryptographic key, NOT an array buffer
	return await window.crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: hexToBuffer(kekSaltHex) as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 }, // The algorithm the KEK will be used for
		false, // raw key bytes cannot be extracted by JavaScript
		["wrapKey", "unwrapKey", "encrypt", "decrypt"],
	);
}
