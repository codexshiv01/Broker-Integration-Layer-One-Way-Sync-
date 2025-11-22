/**
 * Sync Service
 * Main orchestration layer for syncing trades from brokers
 */

import { IBrokerAdapter } from '../adapters/base';
import { ZerodhaAdapter } from '../adapters/zerodha';
import { NormalizedTrade } from '../models/trade';
import { tokenManager, TokenManager } from './tokenManager';
import {
    BrokerNotFoundError,
    TokenInvalidError
} from '../utils/errors';
import { logger } from '../utils/logger';

export interface SyncOptions {
    /** Start date for trade history */
    fromDate?: Date;

    /** End date for trade history */
    toDate?: Date;

    /** Specific symbol to filter */
    symbol?: string;

    /** Maximum number of trades to fetch */
    limit?: number;

    /** Force token refresh even if not expired */
    forceRefresh?: boolean;
}

export interface SyncResult {
    /** Whether the sync was successful */
    success: boolean;

    /** Normalized trades */
    trades: NormalizedTrade[];

    /** Number of trades synced */
    count: number;

    /** Sync timestamp */
    syncedAt: Date;

    /** User ID */
    userId: string;

    /** Broker name */
    brokerName: string;

    /** Error message if sync failed */
    error?: string;

    /** Additional metadata */
    metadata?: Record<string, any>;
}

export class SyncService {
    private adapters: Map<string, IBrokerAdapter>;
    private tokenMgr: TokenManager;

    constructor(tokenManager: TokenManager) {
        this.adapters = new Map();
        this.tokenMgr = tokenManager;
        this.initializeAdapters();
    }

    /**
     * Initialize available broker adapters
     */
    private initializeAdapters(): void {
        // Initialize Zerodha adapter
        const zerodhaApiKey = process.env.ZERODHA_API_KEY || 'demo_api_key';
        const zerodhaAdapter = new ZerodhaAdapter(zerodhaApiKey);
        this.adapters.set(zerodhaAdapter.brokerName, zerodhaAdapter);

        logger.info(`Initialized ${this.adapters.size} broker adapter(s)`);
    }

    /**
     * Register a new broker adapter
     * This allows easy extension with new brokers
     */
    registerAdapter(adapter: IBrokerAdapter): void {
        this.adapters.set(adapter.brokerName, adapter);
        logger.info(`Registered new adapter: ${adapter.brokerName}`);
    }

    /**
     * Get available broker names
     */
    getAvailableBrokers(): string[] {
        return Array.from(this.adapters.keys());
    }

    /**
     * Main sync function - orchestrates the entire sync process
     */
    async syncTrades(
        userId: string,
        brokerName: string,
        options?: SyncOptions
    ): Promise<SyncResult> {
        logger.info(`Starting trade sync for user ${userId} (broker: ${brokerName})`);

        try {
            // Step 1: Get the appropriate broker adapter
            const adapter = this.adapters.get(brokerName.toLowerCase());
            if (!adapter) {
                throw new BrokerNotFoundError(brokerName);
            }

            // Step 2: Retrieve user token
            let token = this.tokenMgr.getToken(userId, brokerName);
            if (!token) {
                throw new TokenInvalidError(`No token found for user ${userId} and broker ${brokerName}`);
            }

            // Step 3: Refresh token if needed or forced
            if (options?.forceRefresh || this.tokenMgr.isTokenExpired(token)) {
                logger.info('Token refresh required');
                token = await this.tokenMgr.refreshTokenIfNeeded(userId, brokerName, adapter);
            }

            // Step 4: Validate token
            const validation = await adapter.validateToken(token.accessToken);
            if (!validation.isValid) {
                throw new TokenInvalidError(
                    validation.reason || 'Token validation failed'
                );
            }

            // Step 5: Fetch trades from broker
            logger.info('Fetching trades from broker API');
            const rawTrades = await adapter.fetchTrades(token.accessToken, {
                fromDate: options?.fromDate,
                toDate: options?.toDate,
                symbol: options?.symbol,
                limit: options?.limit
            });

            if (rawTrades.length === 0) {
                logger.warn('No trades found');
                return {
                    success: true,
                    trades: [],
                    count: 0,
                    syncedAt: new Date(),
                    userId,
                    brokerName,
                    metadata: { message: 'No trades found for the specified criteria' }
                };
            }

            // Step 6: Normalize trade data
            logger.info(`Normalizing ${rawTrades.length} trades`);
            const normalizedTrades = rawTrades.map((rawTrade) =>
                adapter.normalizeTradeData(rawTrade)
            );

            // Step 7: Return successful result
            logger.info(`Successfully synced ${normalizedTrades.length} trades`);
            return {
                success: true,
                trades: normalizedTrades,
                count: normalizedTrades.length,
                syncedAt: new Date(),
                userId,
                brokerName,
                metadata: {
                    tokenRefreshed: options?.forceRefresh || this.tokenMgr.isTokenExpired(token)
                }
            };
        } catch (error) {
            logger.error('Trade sync failed:', error);

            return {
                success: false,
                trades: [],
                count: 0,
                syncedAt: new Date(),
                userId,
                brokerName,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                metadata: {
                    errorType: error instanceof Error ? error.constructor.name : 'Unknown'
                }
            };
        }
    }

    /**
     * Sync trades from multiple brokers for a user
     */
    async syncMultipleBrokers(
        userId: string,
        brokerNames: string[],
        options?: SyncOptions
    ): Promise<SyncResult[]> {
        logger.info(`Syncing trades from ${brokerNames.length} brokers for user ${userId}`);

        const results = await Promise.allSettled(
            brokerNames.map((brokerName) => this.syncTrades(userId, brokerName, options))
        );

        return results.map((result) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                // Handle rejected promises
                return {
                    success: false,
                    trades: [],
                    count: 0,
                    syncedAt: new Date(),
                    userId,
                    brokerName: 'unknown',
                    error: result.reason?.message || 'Sync failed'
                };
            }
        });
    }
}

// Export singleton instance
export const syncService = new SyncService(tokenManager);
