/**
 * Error class for handling HTTP-specific exceptions in serverless functions.
 */
export class HttpError extends Error {
	public statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		this.name = "HttpError";

		Object.setPrototypeOf(this, HttpError.prototype);
	}
}
