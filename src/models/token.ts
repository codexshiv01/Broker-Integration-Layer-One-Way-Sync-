/**
 * Token management types
 */

export interface UserToken {
    /** User's unique identifier */
    userId: string;

    /** Broker name (e.g., "zerodha", "alpaca") */
    brokerName: string;

    /** Access token for API authentication */
    accessToken: string;

    /** Refresh token for obtaining new access tokens */
    refreshToken?: string;

    /** Token expiry timestamp */
    expiresAt: Date;

    /** When the token was created/last refreshed */
    createdAt: Date;

    /** Additional metadata */
    metadata?: Record<string, any>;
}

export interface TokenResponse {
    /** New access token */
    accessToken: string;

    /** New refresh token (if provided) */
    refreshToken?: string;

    /** Token expiry in seconds */
    expiresIn: number;

    /** Token type (usually "Bearer") */
    tokenType?: string;
}

export interface TokenValidationResult {
    /** Whether the token is valid */
    isValid: boolean;

    /** Reason for invalidity (if applicable) */
    reason?: string;

    /** Whether the token is expired */
    isExpired?: boolean;
}
