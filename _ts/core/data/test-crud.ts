import { getActiveDEK } from "../../core/auth/login-client";
import {
	deleteSupaDocument,
	fetchSingleSupaDocument,
	fetchSupaDocuments,
	saveSupaDocument,
} from "../../core/data/db";

// A dummy type for our test
interface TestPayload {
	message: string;
	value: number;
}

export async function runCrudTest() {
	console.log("--- STARTING ZERO-KNOWLEDGE CRUD TEST ---");

	try {
		getActiveDEK(); // Will throw an error if the vault is locked
		console.log("Vault is unlocked. DEK is active in memory.");

		const testId = crypto.randomUUID();
		const docType = "test_crud_item";
		const initialPayload: TestPayload = {
			message: "Hello World",
			value: 42,
		};

		// --- CREATE ---
		console.log(`\n1. CREATING document with ID: ${testId}`);
		await saveSupaDocument(testId, docType, initialPayload);
		console.log(
			"Create successful! (Check Supabase dashboard to see the ciphertext)",
		);

		// --- READ ALL ---
		console.log(`\n2. FETCHING all documents of type '${docType}'...`);
		let docs = await fetchSupaDocuments<TestPayload>(docType);
		console.log(`Fetch successful! Found ${docs.length} docs.`);
		console.log("Decrypted Data:", docs[0]?.data);

		// --- UPDATE ---
		console.log(`\n3. UPDATING document...`);
		const updatedPayload: TestPayload = {
			message: "Updated World",
			value: 99,
		};
		await saveSupaDocument(testId, docType, updatedPayload);
		console.log("Update successful!");

		// --- READ SINGLE ---
		console.log(`\n4. FETCHING single document to verify update...`);
		const singleDoc = await fetchSingleSupaDocument<TestPayload>(testId);
		console.log("Fetch single successful!");
		console.log("Updated Data:", singleDoc?.data);

		// --- DELETE ---
		console.log(`\n5. DELETING document...`);
		await deleteSupaDocument(testId);
		console.log("Delete successful!");

		// --- VERIFY DELETION ---
		console.log(`\n6. VERIFYING deletion...`);
		docs = await fetchSupaDocuments<TestPayload>(docType);
		if (docs.length === 0) {
			console.log("Verification successful! Document is permanently gone.");
		} else {
			console.error("Document still exists!");
		}
	} catch (e) {
		console.error("\nCRUD Test Failed:", e);
		alert(`CRUD Test Failed: ${e}`);
	}
}
