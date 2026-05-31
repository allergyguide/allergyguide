import { FoodType, type Unit } from "./types";

/**
 * Get the measuring unit for a food by its physical form
 *
 * @param food - Food object containing a `type` field of type `FoodType`
 * @returns {Unit} "g" for SOLID; "ml" for LIQUID; "capsule" for CAPSULE
 */
export function getMeasuringUnit(food: { type: FoodType }): Unit {
	if (food.type === FoodType.LIQUID) {
		return "ml";
	} else if (food.type === FoodType.CAPSULE) {
		return "capsule";
	} else {
		return "g";
	}
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed since the last time the debounced function was invoked
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns {Function} The new debounced function
 */
export function debounce<A extends unknown[]>(
	func: (...args: A) => void,
	wait: number,
): (...args: A) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: A) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}
