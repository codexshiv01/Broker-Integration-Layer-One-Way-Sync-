/**
 * Zerodha Kite Connect Adapter
 * Implements the broker adapter interface for Zerodha's Kite Connect API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { IBrokerAdapter, FetchTradesOptions } from './base';
import {
    NormalizedTrade,
    RawTrade,
    TransactionType,
    TradeStatus,
    ProductType
} from '../models/trade';
import { TokenResponse, TokenValidationResult } from '../models/token';
import { APIError, TokenExpiredError, TokenInvalidError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Zerodha Kite Connect API response structure
 */
interface KiteAPIResponse<T> {
    status: 'success' | 'error';
    data?: T;
    error_type?: string;
    message?: string;
}

/**
 * Zerodha trade data structure (from API documentation)
 */
interface ZerodhaTradeData {
    trade_id: string;
    order_id: string;
    exchange: string;
    tradingsymbol: string;
    instrument_token: number;
    product: string;
    average_price: number;
    quantity: number;
    exchange_order_id: string;
    transaction_type: 'BUY' | 'SELL';
    fill_timestamp: string;
    order_timestamp: string;
    exchange_timestamp: string;
}

export class ZerodhaAdapter implements IBrokerAdapter {
    readonly brokerName = 'zerodha';
    private readonly baseURL = 'https://api.kite.trade';
    private readonly apiVersion = '3';
    private apiKey: string;
    private httpClient: AxiosInstance;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.httpClient = axios.create({
            baseURL: this.baseURL,
            headers: {
                'X-Kite-Version': this.apiVersion,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 seconds
        });

        // Add response interceptor for error handling
        this.httpClient.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                return Promise.reject(this.handleAPIError(error));
            }
        );
    }

    /**
     * Fetch all trades for the current day
     */
    async fetchTrades(
        accessToken: string,
        options?: FetchTradesOptions
    ): Promise<RawTrade[]> {
        logger.info('Fetching trades from Zerodha Kite Connect');

        try {
            const response = await this.httpClient.get<KiteAPIResponse<ZerodhaTradeData[]>>(
                '/trades',
                {
                    headers: {
                        Authorization: `token ${this.apiKey}:${accessToken}`
                    }
                }
            );

            if (response.data.status === 'error') {
                throw new APIError(
                    response.data.message || 'Failed to fetch trades',
                    response.status,
                    { error_type: response.data.error_type }
                );
            }

            const trades = response.data.data || [];
            logger.info(`Successfully fetched ${trades.length} trades from Zerodha`);

            // Apply filters if provided
            let filteredTrades = trades;

            if (options?.symbol) {
                filteredTrades = filteredTrades.filter(
                    (trade) => trade.tradingsymbol === options.symbol
                );
            }

            if (options?.limit) {
                filteredTrades = filteredTrades.slice(0, options.limit);
            }

            return filteredTrades;
        } catch (error) {
            logger.error('Error fetching trades from Zerodha:', error);
            throw error;
        }
    }

    /**
     * Normalize Zerodha trade data to standard format
     */
    normalizeTradeData(rawTrade: RawTrade): NormalizedTrade {
        const zerodhaData = rawTrade as ZerodhaTradeData;

        return {
            tradeId: zerodhaData.trade_id,
            orderId: zerodhaData.order_id,
            symbol: zerodhaData.tradingsymbol,
            exchange: zerodhaData.exchange,
            instrumentToken: zerodhaData.instrument_token,
            transactionType: zerodhaData.transaction_type as TransactionType,
            quantity: zerodhaData.quantity,
            price: zerodhaData.average_price,
            averagePrice: zerodhaData.average_price,
            product: this.mapProductType(zerodhaData.product),
            timestamp: this.parseTimestamp(zerodhaData.fill_timestamp),
            orderTimestamp: this.parseTimestamp(zerodhaData.order_timestamp),
            exchangeTimestamp: this.parseTimestamp(zerodhaData.exchange_timestamp),
            status: TradeStatus.COMPLETE, // Filled trades are complete
            exchangeOrderId: zerodhaData.exchange_order_id,
            metadata: {
                broker: 'zerodha',
                rawData: zerodhaData
            }
        };
    }

    /**
     * Refresh access token (simulated for Zerodha)
     * Note: Zerodha requires manual login flow for token generation
     * This is a placeholder implementation
     */
    async refreshToken(_refreshToken: string): Promise<TokenResponse> {
        logger.warn('Zerodha does not support automatic token refresh');
        logger.warn('Users must manually re-authenticate through Kite Connect login flow');

        // Simulated response - in production, this would require user intervention
        throw new APIError(
            'Zerodha requires manual re-authentication. Please login again.',
            401,
            { requiresManualAuth: true }
        );
    }

    /**
     * Validate access token by making a test API call
     */
    async validateToken(accessToken: string): Promise<TokenValidationResult> {
        logger.debug('Validating Zerodha access token');

        try {
            // Make a lightweight API call to validate token
            const response = await this.httpClient.get<KiteAPIResponse<any>>(
                '/user/profile',
                {
                    headers: {
                        Authorization: `token ${this.apiKey}:${accessToken}`
                    }
                }
            );

            if (response.data.status === 'success') {
                logger.debug('Token is valid');
                return { isValid: true };
            }

            return {
                isValid: false,
                reason: response.data.message || 'Unknown error'
            };
        } catch (error) {
            if (error instanceof TokenExpiredError || error instanceof TokenInvalidError) {
                return {
                    isValid: false,
                    isExpired: error instanceof TokenExpiredError,
                    reason: error.message
                };
            }

            return {
                isValid: false,
                reason: 'Token validation failed'
            };
        }
    }

    /**
     * Map Zerodha product types to our enum
     */
    private mapProductType(product: string): ProductType {
        const productMap: Record<string, ProductType> = {
            'CNC': ProductType.CNC,
            'MIS': ProductType.MIS,
            'NRML': ProductType.NRML,
            'CO': ProductType.CO,
            'BO': ProductType.BO
        };

        return productMap[product] || ProductType.CNC;
    }

    /**
     * Parse Zerodha timestamp strings to Date objects
     */
    private parseTimestamp(timestamp: string): Date {
        // Zerodha timestamps are in format "2021-05-31 09:16:39"
        return new Date(timestamp);
    }

    /**
     * Handle API errors and convert to custom error types
     */
    private handleAPIError(error: AxiosError): Error {
        if (!error.response) {
            return new APIError('Network error: Unable to reach Zerodha API');
        }

        const status = error.response.status;
        const data = error.response.data as KiteAPIResponse<any>;

        // Handle specific error types
        if (status === 401 || status === 403) {
            if (data.error_type === 'TokenException') {
                return new TokenExpiredError(data.message);
            }
            return new TokenInvalidError(data.message || 'Authentication failed');
        }

        if (status === 429) {
            return new APIError('Rate limit exceeded', status);
        }

        return new APIError(
            data.message || 'API request failed',
            status,
            { error_type: data.error_type }
        );
    }
}
