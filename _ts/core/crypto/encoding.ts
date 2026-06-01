/**
 * Converts a standard UTF-8 string into a Uint8Array
 *
 * @param str - Input string
 * @returns {Uint8Array} Encoded buffer
 */
export function stringToBuffer(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

/**
 * Converts a buffer into a standard UTF-8 string
 *
 * @param buffer - Input buffer
 * @returns {string} Decoded string
 */
export function bufferToString(buffer: ArrayBuffer | Uint8Array): string {
	return new TextDecoder().decode(buffer);
}

/**
 * Converts a buffer to a base64 string
 *
 * @param buffer - Input buffer
 * @returns {string} Base64 encoded string
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = new Uint8Array(buffer);
	// Using Array.from to prevent "Maximum call stack size exceeded" on large buffers
	const binaryString = Array.from(bytes)
		.map((byte) => String.fromCharCode(byte))
		.join("");
	return btoa(binaryString);
}

/**
 * Converts a base64 string into a Uint8Array
 *
 * @param base64 - Base64 encoded string
 * @returns {Uint8Array} Decoded buffer
 */
export function base64ToBuffer(base64: string): Uint8Array {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

/**
 * Converts a buffer to a hex string
 *
 * @param buffer - Input buffer
 * @returns {string} Hex encoded string
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Converts a hex string into a Uint8Array
 *
 * @param hex - Hex encoded string
 * @returns {Uint8Array} Decoded buffer
 * @throws {Error} If hex string length is invalid
 */
export function hexToBuffer(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) {
		throw new Error("Invalid hex string: length must be even");
	}
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}
