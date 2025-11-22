/**
 * Custom error classes for broker sync operations
 */

export class BrokerSyncError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'BrokerSyncError';
        Object.setPrototypeOf(this, BrokerSyncError.prototype);
    }
}

export class TokenExpiredError extends BrokerSyncError {
    constructor(message: string = 'Access token has expired', details?: any) {
        super(message, 'TOKEN_EXPIRED', details);
        this.name = 'TokenExpiredError';
        Object.setPrototypeOf(this, TokenExpiredError.prototype);
    }
}

export class TokenInvalidError extends BrokerSyncError {
    constructor(message: string = 'Access token is invalid', details?: any) {
        super(message, 'TOKEN_INVALID', details);
        this.name = 'TokenInvalidError';
        Object.setPrototypeOf(this, TokenInvalidError.prototype);
    }
}

export class BrokerNotFoundError extends BrokerSyncError {
    constructor(brokerName: string) {
        super(
            `Broker adapter not found: ${brokerName}`,
            'BROKER_NOT_FOUND',
            { brokerName }
        );
        this.name = 'BrokerNotFoundError';
        Object.setPrototypeOf(this, BrokerNotFoundError.prototype);
    }
}

export class APIError extends BrokerSyncError {
    constructor(
        message: string,
        public readonly statusCode?: number,
        details?: any
    ) {
        super(message, 'API_ERROR', { statusCode, ...details });
        this.name = 'APIError';
        Object.setPrototypeOf(this, APIError.prototype);
    }
}

export class NoTradesFoundError extends BrokerSyncError {
    constructor(message: string = 'No trades found for the specified criteria') {
        super(message, 'NO_TRADES_FOUND');
        this.name = 'NoTradesFoundError';
        Object.setPrototypeOf(this, NoTradesFoundError.prototype);
    }
}

export class RateLimitError extends BrokerSyncError {
    constructor(
        message: string = 'API rate limit exceeded',
        public readonly retryAfter?: number
    ) {
        super(message, 'RATE_LIMIT_EXCEEDED', { retryAfter });
        this.name = 'RateLimitError';
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
