import { supabase } from "../api/supabase";
import { getActiveDEK } from "../auth/login-client";
import { decryptData, encryptData } from "../crypto/encryption";

export interface SupaDocument<T> {
	id: string; // The UUID of the specific item (e.g., a protocol UUID)
	doc_type: string; // 'custom_protocol', 'custom_food', etc.
	data: T; // The typed JSON payload after decryption
	created_at: string;
	updated_at: string;
}

/**
 * Represents a new document for the database where created_at is handled by default
 */
export type NewSupaDocument<T> = Omit<
	SupaDocument<T>,
	"created_at" | "updated_at"
>;

/**
 * Upserts a document into the database
 *
 * @param id - Document UUID
 * @param doc_type - Document type identifier
 * @param payload - Typed JSON payload
 * @throws {Error} If vault is locked or save operation fails
 */
export async function saveSupaDocument<T>(
	id: string,
	doc_type: string,
	payload: T,
): Promise<void> {
	const dek = getActiveDEK(); // Will throw if vault is locked

	// Serialize the payload to a string
	const plaintext = JSON.stringify(payload);

	// Encrypt it with a fresh IV
	const { ciphertextBase64, ivBase64 } = await encryptData(plaintext, dek);

	// Upsert to Supabase
	const { error } = await supabase.from("user_documents").upsert({
		id: id,
		doc_type: doc_type,
		encrypted_blob: ciphertextBase64,
		iv: ivBase64,
		updated_at: new Date().toISOString(),
	});

	if (error) {
		console.error(`Failed to save ${doc_type}:`, error);
		throw new Error("Database save failed.");
	}
}

/**
 * Fetches and decrypts all rows for a specific document type
 *
 * @param doc_type - Document type identifier
 * @returns {Promise<SupaDocument<T>[]>} Promise resolving to an array of decrypted documents
 * @throws {Error} If vault is locked or fetch operation fails
 */
export async function fetchSupaDocuments<T>(
	doc_type: string,
): Promise<SupaDocument<T>[]> {
	const dek = getActiveDEK();

	// Fetch encrypted rows from Postgres
	const { data: rows, error } = await supabase
		.from("user_documents")
		.select("id, doc_type, encrypted_blob, iv, created_at, updated_at")
		.eq("doc_type", doc_type);

	if (error) throw new Error(`Failed to fetch ${doc_type} records.`);
	if (!rows || rows.length === 0) return [];

	// Decrypt all rows asynchronously
	const decryptedDocs = await Promise.all(
		rows.map(async (row) => {
			try {
				const decryptedString = await decryptData(
					row.encrypted_blob,
					row.iv,
					dek,
				);
				return {
					id: row.id,
					doc_type: row.doc_type,
					data: JSON.parse(decryptedString) as T,
					created_at: row.created_at,
					updated_at: row.updated_at,
				};
			} catch (decryptionError) {
				console.error(`Failed to decrypt document ${row.id}:`, decryptionError);
				return null; // Return null for failures so one corrupt row doesn't break the whole list
			}
		}),
	);

	// Filter out any that failed to decrypt
	return decryptedDocs.filter((doc): doc is SupaDocument<T> => doc !== null);
}

/**
 * Fetches and decrypts a specific document by its UUID
 *
 * @param id - Document UUID
 * @returns {Promise<SupaDocument<T> | null>} Promise resolving to the decrypted document or null if not found
 * @throws {Error} If vault is locked
 */
export async function fetchSingleSupaDocument<T>(
	id: string,
): Promise<SupaDocument<T> | null> {
	const dek = getActiveDEK();

	const { data: row, error } = await supabase
		.from("user_documents")
		.select("id, doc_type, encrypted_blob, iv, created_at, updated_at")
		.eq("id", id)
		.single();

	if (error || !row) return null;

	try {
		const decryptedString = await decryptData(row.encrypted_blob, row.iv, dek);
		return {
			id: row.id,
			doc_type: row.doc_type,
			data: JSON.parse(decryptedString) as T,
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
	} catch (e) {
		console.error(`Failed to decrypt document ${id}`, e);
		return null;
	}
}

/**
 * Deletes a document by its UUID
 *
 * @param id - Document UUID
 * @throws {Error} If delete operation fails
 */
export async function deleteSupaDocument(id: string): Promise<void> {
	const { error } = await supabase.from("user_documents").delete().eq("id", id);

	if (error) {
		console.error(`Failed to delete document ${id}:`, error);
		throw new Error("Database delete failed.");
	}
}
