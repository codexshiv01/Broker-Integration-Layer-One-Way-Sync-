/**
 * Broker Sync - Main Entry Point
 * Demonstrates usage of the broker integration layer
 */

import dotenv from 'dotenv';
import { syncService } from './services/syncService';
import { tokenManager } from './services/tokenManager';
import { UserToken } from './models/token';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

/**
 * Example: Sync trades for a user
 */
async function exampleSyncTrades() {
    try {
        // Example user credentials
        const userId = 'user123';
        const brokerName = 'zerodha';

        // Create a sample token (in production, this would come from authentication)
        const userToken: UserToken = {
            userId,
            brokerName,
            accessToken: process.env.ZERODHA_ACCESS_TOKEN || 'demo_access_token',
            refreshToken: 'demo_refresh_token',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            createdAt: new Date()
        };

        // Store the token
        tokenManager.storeToken(userId, userToken);
        logger.info('User token stored successfully');

        // Sync trades
        logger.info('Starting trade sync...');
        const result = await syncService.syncTrades(userId, brokerName, {
            limit: 10 // Fetch up to 10 trades
        });

        // Display results
        if (result.success) {
            logger.info(`✓ Sync successful! Found ${result.count} trades`);

            if (result.trades.length > 0) {
                console.log('\n=== Sample Trades ===');
                result.trades.slice(0, 3).forEach((trade, index) => {
                    console.log(`\nTrade ${index + 1}:`);
                    console.log(`  Symbol: ${trade.symbol}`);
                    console.log(`  Type: ${trade.transactionType}`);
                    console.log(`  Quantity: ${trade.quantity}`);
                    console.log(`  Price: ₹${trade.price}`);
                    console.log(`  Exchange: ${trade.exchange}`);
                    console.log(`  Time: ${trade.timestamp.toISOString()}`);
                });
            }
        } else {
            logger.error(`✗ Sync failed: ${result.error}`);
        }

        return result;
    } catch (error) {
        logger.error('Error in example:', error);
        throw error;
    }
}

/**
 * Example: Get available brokers
 */
function exampleListBrokers() {
    const brokers = syncService.getAvailableBrokers();
    console.log('\n=== Available Brokers ===');
    brokers.forEach((broker, index) => {
        console.log(`${index + 1}. ${broker}`);
    });
}

/**
 * Main execution
 */
async function main() {
    console.log('=================================');
    console.log('  Broker Sync - Demo');
    console.log('=================================\n');

    // List available brokers
    exampleListBrokers();

    // Run sync example
    await exampleSyncTrades();

    console.log('\n=================================');
    console.log('  Demo Complete');
    console.log('=================================\n');
}

// Run if executed directly
if (require.main === module) {
    main().catch((error) => {
        logger.error('Fatal error:', error);
        process.exit(1);
    });
}

// Export for use as a library
export { syncService, tokenManager };
export * from './models/trade';
export * from './models/token';
export * from './adapters/base';
export * from './adapters/zerodha';
export * from './services/syncService';
export * from './services/tokenManager';
export * from './utils/errors';
