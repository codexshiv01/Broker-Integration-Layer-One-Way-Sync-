/**
 * Sync Service Tests
 * Tests for the main sync orchestration logic
 */

import { SyncService } from '../src/services/syncService';
import { TokenManager } from '../src/services/tokenManager';
import { ZerodhaAdapter } from '../src/adapters/zerodha';
import { UserToken } from '../src/models/token';
import { BrokerNotFoundError, TokenInvalidError } from '../src/utils/errors';

describe('SyncService', () => {
    let syncService: SyncService;
    let tokenManager: TokenManager;

    beforeEach(() => {
        tokenManager = new TokenManager();
        syncService = new SyncService(tokenManager);
    });

    afterEach(() => {
        tokenManager.clearAllTokens();
    });

    describe('getAvailableBrokers', () => {
        it('should return list of available brokers', () => {
            const brokers = syncService.getAvailableBrokers();
            expect(brokers).toContain('zerodha');
            expect(brokers.length).toBeGreaterThan(0);
        });
    });

    describe('registerAdapter', () => {
        it('should allow registering a new adapter', () => {
            const customAdapter = new ZerodhaAdapter('custom_key');
            const initialCount = syncService.getAvailableBrokers().length;

            // Register with a different name by creating a mock adapter
            const mockAdapter = {
                ...customAdapter,
                brokerName: 'custom_broker'
            };

            syncService.registerAdapter(mockAdapter as any);

            const newCount = syncService.getAvailableBrokers().length;
            expect(newCount).toBe(initialCount + 1);
            expect(syncService.getAvailableBrokers()).toContain('custom_broker');
        });
    });

    describe('syncTrades', () => {
        it('should fail when broker is not found', async () => {
            const userId = 'test_user';
            const result = await syncService.syncTrades(userId, 'invalid_broker');

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
            expect(result.count).toBe(0);
            expect(result.trades).toHaveLength(0);
        });

        it('should fail when no token is found for user', async () => {
            const userId = 'test_user';
            const result = await syncService.syncTrades(userId, 'zerodha');

            expect(result.success).toBe(false);
            expect(result.error).toContain('No token found');
            expect(result.count).toBe(0);
        });

        it('should return sync result with metadata', async () => {
            const userId = 'test_user';
            const brokerName = 'zerodha';

            // Create and store a token
            const token: UserToken = {
                userId,
                brokerName,
                accessToken: 'test_token',
                refreshToken: 'test_refresh',
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
                createdAt: new Date()
            };

            tokenManager.storeToken(userId, token);

            const result = await syncService.syncTrades(userId, brokerName);

            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('trades');
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('syncedAt');
            expect(result).toHaveProperty('userId');
            expect(result).toHaveProperty('brokerName');
            expect(result.userId).toBe(userId);
            expect(result.brokerName).toBe(brokerName);
        });
    });

    describe('syncMultipleBrokers', () => {
        it('should sync from multiple brokers', async () => {
            const userId = 'test_user';
            const brokers = ['zerodha'];

            // Store token for zerodha
            const token: UserToken = {
                userId,
                brokerName: 'zerodha',
                accessToken: 'test_token',
                refreshToken: 'test_refresh',
                expiresAt: new Date(Date.now() + 3600000),
                createdAt: new Date()
            };

            tokenManager.storeToken(userId, token);

            const results = await syncService.syncMultipleBrokers(userId, brokers);

            expect(results).toHaveLength(1);
            expect(results[0]).toHaveProperty('success');
            expect(results[0]).toHaveProperty('brokerName');
        });

        it('should handle failures gracefully', async () => {
            const userId = 'test_user';
            const brokers = ['zerodha', 'invalid_broker'];

            const results = await syncService.syncMultipleBrokers(userId, brokers);

            expect(results).toHaveLength(2);
            // Both should fail (no tokens stored)
            expect(results.every(r => !r.success)).toBe(true);
        });
    });
});

describe('TokenManager', () => {
    let tokenManager: TokenManager;

    beforeEach(() => {
        tokenManager = new TokenManager();
    });

    afterEach(() => {
        tokenManager.clearAllTokens();
    });

    describe('storeToken and getToken', () => {
        it('should store and retrieve a token', () => {
            const userId = 'user123';
            const token: UserToken = {
                userId,
                brokerName: 'zerodha',
                accessToken: 'test_access_token',
                refreshToken: 'test_refresh_token',
                expiresAt: new Date(Date.now() + 3600000),
                createdAt: new Date()
            };

            tokenManager.storeToken(userId, token);
            const retrieved = tokenManager.getToken(userId, 'zerodha');

            expect(retrieved).not.toBeNull();
            expect(retrieved?.accessToken).toBe('test_access_token');
            expect(retrieved?.userId).toBe(userId);
        });

        it('should return null for non-existent token', () => {
            const retrieved = tokenManager.getToken('nonexistent', 'zerodha');
            expect(retrieved).toBeNull();
        });
    });

    describe('isTokenExpired', () => {
        it('should detect expired tokens', () => {
            const expiredToken: UserToken = {
                userId: 'user123',
                brokerName: 'zerodha',
                accessToken: 'test_token',
                expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
                createdAt: new Date()
            };

            expect(tokenManager.isTokenExpired(expiredToken)).toBe(true);
        });

        it('should detect valid tokens', () => {
            const validToken: UserToken = {
                userId: 'user123',
                brokerName: 'zerodha',
                accessToken: 'test_token',
                expiresAt: new Date(Date.now() + 3600000), // Expires in 1 hour
                createdAt: new Date()
            };

            expect(tokenManager.isTokenExpired(validToken)).toBe(false);
        });
    });

    describe('removeToken', () => {
        it('should remove a stored token', () => {
            const userId = 'user123';
            const token: UserToken = {
                userId,
                brokerName: 'zerodha',
                accessToken: 'test_token',
                expiresAt: new Date(Date.now() + 3600000),
                createdAt: new Date()
            };

            tokenManager.storeToken(userId, token);
            expect(tokenManager.getToken(userId, 'zerodha')).not.toBeNull();

            tokenManager.removeToken(userId, 'zerodha');
            expect(tokenManager.getToken(userId, 'zerodha')).toBeNull();
        });
    });

    describe('getUserTokens', () => {
        it('should return all tokens for a user', () => {
            const userId = 'user123';

            const token1: UserToken = {
                userId,
                brokerName: 'zerodha',
                accessToken: 'token1',
                expiresAt: new Date(Date.now() + 3600000),
                createdAt: new Date()
            };

            const token2: UserToken = {
                userId,
                brokerName: 'alpaca',
                accessToken: 'token2',
                expiresAt: new Date(Date.now() + 3600000),
                createdAt: new Date()
            };

            tokenManager.storeToken(userId, token1);
            tokenManager.storeToken(userId, token2);

            const userTokens = tokenManager.getUserTokens(userId);
            expect(userTokens).toHaveLength(2);
            expect(userTokens.map(t => t.brokerName)).toContain('zerodha');
            expect(userTokens.map(t => t.brokerName)).toContain('alpaca');
        });
    });

    describe('clearAllTokens', () => {
        it('should clear all stored tokens', () => {
            const token: UserToken = {
                userId: 'user123',
                brokerName: 'zerodha',
                accessToken: 'test_token',
                expiresAt: new Date(Date.now() + 3600000),
                createdAt: new Date()
            };

            tokenManager.storeToken('user123', token);
            expect(tokenManager.getToken('user123', 'zerodha')).not.toBeNull();

            tokenManager.clearAllTokens();
            expect(tokenManager.getToken('user123', 'zerodha')).toBeNull();
        });
    });
});
