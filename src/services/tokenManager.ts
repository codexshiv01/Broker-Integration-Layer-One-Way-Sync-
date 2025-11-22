/**
 * Token Manager Service
 * Handles in-memory storage and management of user tokens
 */

import { UserToken } from '../models/token';
import { IBrokerAdapter } from '../adapters/base';
import { TokenExpiredError, TokenInvalidError } from '../utils/errors';
import { logger } from '../utils/logger';

export class TokenManager {
    private tokens: Map<string, UserToken>;

    constructor() {
        this.tokens = new Map();
    }

    /**
     * Store a user token
     */
    storeToken(userId: string, token: UserToken): void {
        const key = this.getTokenKey(userId, token.brokerName);
        this.tokens.set(key, token);
        logger.debug(`Stored token for user ${userId} (broker: ${token.brokerName})`);
    }

    /**
     * Retrieve a user token
     */
    getToken(userId: string, brokerName: string): UserToken | null {
        const key = this.getTokenKey(userId, brokerName);
        const token = this.tokens.get(key);

        if (!token) {
            logger.debug(`No token found for user ${userId} (broker: ${brokerName})`);
            return null;
        }

        return token;
    }

    /**
     * Check if a token is expired
     */
    isTokenExpired(token: UserToken): boolean {
        const now = new Date();
        const isExpired = now >= token.expiresAt;

        if (isExpired) {
            logger.debug(`Token expired for user ${token.userId} (broker: ${token.brokerName})`);
        }

        return isExpired;
    }

    /**
     * Refresh token if needed
     */
    async refreshTokenIfNeeded(
        userId: string,
        brokerName: string,
        adapter: IBrokerAdapter
    ): Promise<UserToken> {
        const token = this.getToken(userId, brokerName);

        if (!token) {
            throw new TokenInvalidError('No token found for user');
        }

        // If token is not expired, return it as-is
        if (!this.isTokenExpired(token)) {
            logger.debug(`Token is still valid for user ${userId}`);
            return token;
        }

        // Token is expired, attempt to refresh
        logger.info(`Attempting to refresh token for user ${userId}`);

        if (!token.refreshToken) {
            throw new TokenExpiredError('Token expired and no refresh token available');
        }

        try {
            const newTokenData = await adapter.refreshToken(token.refreshToken);

            // Create updated token
            const updatedToken: UserToken = {
                userId: token.userId,
                brokerName: token.brokerName,
                accessToken: newTokenData.accessToken,
                refreshToken: newTokenData.refreshToken || token.refreshToken,
                expiresAt: new Date(Date.now() + newTokenData.expiresIn * 1000),
                createdAt: new Date(),
                metadata: token.metadata
            };

            // Store the updated token
            this.storeToken(userId, updatedToken);
            logger.info(`Successfully refreshed token for user ${userId}`);

            return updatedToken;
        } catch (error) {
            logger.error(`Failed to refresh token for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a user token
     */
    removeToken(userId: string, brokerName: string): void {
        const key = this.getTokenKey(userId, brokerName);
        this.tokens.delete(key);
        logger.debug(`Removed token for user ${userId} (broker: ${brokerName})`);
    }

    /**
     * Clear all tokens
     */
    clearAllTokens(): void {
        this.tokens.clear();
        logger.info('Cleared all tokens from memory');
    }

    /**
     * Get all tokens for a user across all brokers
     */
    getUserTokens(userId: string): UserToken[] {
        const userTokens: UserToken[] = [];

        for (const token of this.tokens.values()) {
            if (token.userId === userId) {
                userTokens.push(token);
            }
        }

        return userTokens;
    }

    /**
     * Generate a unique key for token storage
     */
    private getTokenKey(userId: string, brokerName: string): string {
        return `${userId}:${brokerName}`;
    }
}

// Export singleton instance
export const tokenManager = new TokenManager();
