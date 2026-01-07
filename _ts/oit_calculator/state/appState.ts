import fuzzysort from "fuzzysort";
import { type FoodData, type ProtocolData } from "../types";
// Helper type: Takes any object T and adds the 'prepared' property from Fuzzysort
type PreparedItem<T> = T & { prepared: Fuzzysort.Prepared };

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

  public isLoggedIn: boolean = false;
  public username: string | null = null;

  constructor(publicData: { foods: FoodData[], protocols: ProtocolData[] }, warningsUrl: string) {
    this.warningsPageURL = warningsUrl;

    // Initialize with CNF data + sample protocol
    this.foodsDatabase = [...publicData.foods];
    this.protocolsDatabase = [...publicData.protocols];

    this.rebuildIndices();
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
