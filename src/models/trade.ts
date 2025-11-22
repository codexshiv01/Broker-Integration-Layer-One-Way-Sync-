/**
 * Normalized trade model
 * This is the standardized format that all broker adapters must transform their data into
 */

export enum TransactionType {
    BUY = 'BUY',
    SELL = 'SELL'
}

export enum TradeStatus {
    COMPLETE = 'COMPLETE',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

export enum ProductType {
    CNC = 'CNC',     // Cash and Carry (delivery)
    MIS = 'MIS',     // Margin Intraday Square-off
    NRML = 'NRML',   // Normal (for futures and options)
    CO = 'CO',       // Cover Order
    BO = 'BO'        // Bracket Order
}

/**
 * Normalized trade structure
 * All broker-specific trade data should be transformed into this format
 */
export interface NormalizedTrade {
    /** Unique identifier for the trade */
    tradeId: string;

    /** Associated order ID */
    orderId: string;

    /** Trading symbol/ticker (e.g., "SBIN", "RELIANCE") */
    symbol: string;

    /** Exchange name (e.g., "NSE", "BSE", "MCX", "CDS") */
    exchange: string;

    /** Unique instrument identifier from the broker */
    instrumentToken: number;

    /** Transaction type: BUY or SELL */
    transactionType: TransactionType;

    /** Number of units traded */
    quantity: number;

    /** Execution price per unit */
    price: number;

    /** Average price for partial fills */
    averagePrice: number;

    /** Product type (CNC, MIS, NRML, etc.) */
    product: ProductType;

    /** Trade execution timestamp */
    timestamp: Date;

    /** Order placement timestamp */
    orderTimestamp: Date;

    /** Exchange timestamp */
    exchangeTimestamp: Date;

    /** Trade status */
    status: TradeStatus;

    /** Exchange-specific order ID */
    exchangeOrderId: string;

    /** Additional broker-specific metadata */
    metadata?: Record<string, any>;
}

/**
 * Raw trade data from broker (generic type)
 * Each broker will have its own structure
 */
export type RawTrade = Record<string, any>;
