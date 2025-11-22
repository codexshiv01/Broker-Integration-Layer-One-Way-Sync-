/**
 * Base broker adapter interface
 * All broker-specific adapters must implement this interface
 */

import { NormalizedTrade, RawTrade } from '../models/trade';
import { TokenResponse, TokenValidationResult } from '../models/token';

export interface FetchTradesOptions {
    /** Start date for trade history */
    fromDate?: Date;

    /** End date for trade history */
    toDate?: Date;

    /** Specific trading symbol to filter */
    symbol?: string;

    /** Maximum number of trades to fetch */
    limit?: number;
}

export interface IBrokerAdapter {
    /** Broker name identifier */
    readonly brokerName: string;

    /**
     * Fetch trades from the broker API
     * @param accessToken - User's access token
     * @param options - Optional filters for trade fetching
     * @returns Array of raw trade data from the broker
     */
    fetchTrades(
        accessToken: string,
        options?: FetchTradesOptions
    ): Promise<RawTrade[]>;

    /**
     * Normalize broker-specific trade data to standard format
     * @param rawTrade - Raw trade data from broker
     * @returns Normalized trade object
     */
    normalizeTradeData(rawTrade: RawTrade): NormalizedTrade;

    /**
     * Refresh an expired access token
     * @param refreshToken - User's refresh token
     * @returns New token response
     */
    refreshToken(refreshToken: string): Promise<TokenResponse>;

    /**
     * Validate if an access token is still valid
     * @param accessToken - Token to validate
     * @returns Validation result
     */
    validateToken(accessToken: string): Promise<TokenValidationResult>;
}
