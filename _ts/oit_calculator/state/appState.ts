import fuzzysort from "fuzzysort";
import { type FoodData, type ProtocolData } from "../types";
// Helper type: Takes any object T and adds the 'prepared' property from Fuzzysort
type PreparedItem<T> = T & { prepared: Fuzzysort.Prepared };

type AuthListener = (isLoggedIn: boolean) => void;

export class AppState {
  // raw data loaded 
  public foodsDatabase: FoodData[] = [];
  public protocolsDatabase: ProtocolData[] = [];
  // Indices used by UI
  public foodsIndex: PreparedItem<FoodData>[] = [];
  public protocolsIndex: PreparedItem<ProtocolData>[] = [];

  // Default PDF order 
  // "protocol" is the keyword for the generated table
  public pdfHandouts: string[] = [
    'public_terms', 'protocol',
  ];

  public readonly warningsPageURL: string;

  // FOR AUTH
  public isLoggedIn: boolean = false;
  public username: string | null = null;
  private authListeners: AuthListener[] = [];

  constructor(publicData: { foods: FoodData[], protocols: ProtocolData[] }, warningsUrl: string) {
    this.warningsPageURL = warningsUrl;

    // Initialize with CNF data + sample protocol
    this.foodsDatabase = [...publicData.foods];
    this.protocolsDatabase = [...publicData.protocols];

    this.rebuildIndices();
  }

  /**
   * Updates the application's authentication state and notifies all subscribed listeners.
   * @param isLoggedIn - Whether the user is currently authenticated.
   * @param username - The username of the authenticated user, or null if logged out.
   */
  public setAuthState(isLoggedIn: boolean, username: string | null) {
    this.isLoggedIn = isLoggedIn;
    this.username = username;
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
    this.authListeners.forEach((l) => l(this.isLoggedIn));
  }

  /**
   * Merges secure data (ie other custom foods, protocols) into the application state and rebuilds search indices
   */
  public addSecureData(customFoods: FoodData[] | null, protocols: ProtocolData[] | null, handoutOrder: string[] | null) {
    // Merge Foods (Public + Custom)
    // TODO! ?duplicate check
    this.foodsDatabase = customFoods ? [...this.foodsDatabase, ...customFoods] : this.foodsDatabase;

    // Set Protocols (Assuming protocols are entirely private/secure)
    this.protocolsDatabase = protocols ? protocols : this.protocolsDatabase;

    // set handouts order
    this.pdfHandouts = handoutOrder ? handoutOrder : this.pdfHandouts;

    // Rebuild Search Indices
    this.rebuildIndices();
  }

  private rebuildIndices() {
    this.foodsIndex = this.foodsDatabase.map((f) => ({
      ...f,
      prepared: fuzzysort.prepare(f.Food),
    }));

    this.protocolsIndex = this.protocolsDatabase.map((p) => ({
      ...p,
      prepared: fuzzysort.prepare(p.name),
    }));

    console.log(`Indices rebuilt: ${this.foodsDatabase.length} foods, ${this.protocolsDatabase.length} protocols`);
  }
}
