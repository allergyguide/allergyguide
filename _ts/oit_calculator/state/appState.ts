/**
 * @module
 * Global application state management (User, Auth, Databases).
 */
import fuzzysort from "fuzzysort";
import type { AuthListener, FoodData, ProtocolData } from "../types";

// Helper type: Takes any object T and adds the 'prepared' property from Fuzzysort
type PreparedItem<T> = T & { prepared: Fuzzysort.Prepared };

export class AppState {
	// Raw data storage
	private publicFoods: FoodData[] = [];
	private publicProtocols: ProtocolData[] = [];
	private provisionedFoods: FoodData[] = [];
	private provisionedProtocols: ProtocolData[] = [];
	private userFoods: FoodData[] = [];
	private userProtocols: ProtocolData[] = [];

	// Derived indices used by UI
	public foodsIndex: PreparedItem<FoodData>[] = [];
	public protocolsIndex: PreparedItem<ProtocolData>[] = [];
	public foodsById = new Map<string, FoodData>(); // used for O(1) lookup by ID for foods

	// Default PDF order
	// "protocol" is the keyword for the generated table
	public pdfHandouts: string[] = ["public_terms", "protocol"];

	public readonly warningsPageURL: string;

	// FOR AUTH
	public isLoggedIn: boolean = false;
	public email: string | null = null;
	private authListeners: AuthListener[] = [];

	constructor(
		publicData: { foods: FoodData[]; protocols: ProtocolData[] },
		warningsUrl: string,
	) {
		this.warningsPageURL = warningsUrl;

		// Initialize with CNF data + sample protocol
		this.publicFoods = [...publicData.foods];
		this.publicProtocols = [...publicData.protocols];

		this.rebuildIndices();
	}

	/**
	 * Updates the application's authentication state and notifies all subscribed listeners.
	 * @param isLoggedIn - Whether the user is currently authenticated.
	 * @param email - The email of the authenticated user, or null if logged out.
	 */
	public setAuthState(isLoggedIn: boolean, email: string | null) {
		this.isLoggedIn = isLoggedIn;
		this.email = email;
		this.notifyAuthListeners();
	}

	/**
	 * Registers a callback function to be executed whenever the authentication state changes.
	 * The listener will be called immediately upon future state changes triggered by `setAuthState`.
	 * @param listener - A callback function that receives the new `isLoggedIn` boolean status.
	 */
	public subscribeToAuth(listener: AuthListener) {
		this.authListeners.push(listener);
	}

	/**
	 * Internal helper to broadcast the current login status to all registered listeners.
	 */
	private notifyAuthListeners() {
		this.authListeners.forEach((l) => {
			l(this.isLoggedIn);
		});
	}

	/**
	 * Merges secure data (ie other custom foods, protocols) into the application state and rebuilds search indices
	 */
	public addProvisionedData(
		provisioned_foods: FoodData[] | null,
		provisioned_protocols: ProtocolData[] | null,
		handoutOrder: string[] | null,
	) {
		this.provisionedFoods = provisioned_foods || [];
		this.provisionedProtocols = provisioned_protocols || [];

		// set handouts order
		this.pdfHandouts = handoutOrder ? handoutOrder : this.pdfHandouts;

		// Rebuild Search Indices
		this.rebuildIndices();
	}

	/**
	 * Sets the user's custom data and rebuilds search indices
	 * @param foods - Array of user-created foods
	 * @param protocols - Array of user-created protocols
	 */
	public setUserData(foods: FoodData[], protocols: ProtocolData[]) {
		this.userFoods = foods;
		this.userProtocols = protocols;
		this.rebuildIndices();
		this.notifyAuthListeners();
	}

	// --- Library CRUD (Memory Only) ---

	public getUserProtocols(): ProtocolData[] {
		return [...this.userProtocols];
	}

	public getUserFoods(): FoodData[] {
		return [...this.userFoods];
	}

	public upsertUserFood(food: FoodData) {
		const index = this.userFoods.findIndex(
			(f) => (f as { id?: string }).id === (food as { id?: string }).id,
		);
		if (index > -1) this.userFoods[index] = food;
		else this.userFoods.push(food);
		this.rebuildIndices();
	}

	public deleteUserFood(id: string) {
		this.userFoods = this.userFoods.filter(
			(f) => (f as { id?: string }).id !== id,
		);
		this.rebuildIndices();
	}

	public upsertUserProtocol(proto: ProtocolData) {
		const index = this.userProtocols.findIndex((p) => p.id === proto.id);
		if (index > -1) this.userProtocols[index] = proto;
		else this.userProtocols.push(proto);
		this.rebuildIndices();
	}

	public deleteUserProtocol(id: string) {
		this.userProtocols = this.userProtocols.filter((p) => p.id !== id);
		this.rebuildIndices();
	}

	/*
	 * Rebuilds the search indices for foods and protocols.
	 * Creates a prepared search index for each food and protocol, using their name and keywords.
	 * Foods available for the UI are those that are active (ie not disabled).
	 */
	private rebuildIndices() {
		const allFoods = [
			...this.publicFoods,
			...this.provisionedFoods,
			...this.userFoods,
		];
		const allProtocols = [
			...this.publicProtocols,
			...this.provisionedProtocols,
			...this.userProtocols,
		];

		this.foodsIndex = allFoods
			.filter((f) => !("is_active" in f) || f.is_active !== false)
			.map((f) => {
				// Surrogate key for searching: name + keywords
				const keywordStr = Array.isArray(f.keywords)
					? f.keywords.join(" ")
					: "";
				const surrogate = `${f.name} ${keywordStr}`.trim();
				return {
					...f,
					prepared: fuzzysort.prepare(surrogate),
				};
			});

		// clear and regenerate foodsById
		this.foodsById.clear();
		allFoods.forEach((f) => {
			if ("id" in f && f.id) this.foodsById.set(f.id, f);
		});

		this.protocolsIndex = allProtocols.map((p) => ({
			...p,
			prepared: fuzzysort.prepare(p.name),
		}));

		console.log(
			`Indices rebuilt: ${allFoods.length} foods, ${allProtocols.length} protocols`,
		);
	}
}
