/**
 * Trade Normalizer Tests
 * Tests for Zerodha trade data normalization
 */

import { ZerodhaAdapter } from '../src/adapters/zerodha';
import { TransactionType, TradeStatus, ProductType } from '../src/models/trade';

describe('ZerodhaAdapter - Trade Normalization', () => {
    let adapter: ZerodhaAdapter;

    beforeEach(() => {
        adapter = new ZerodhaAdapter('test_api_key');
    });

    describe('normalizeTradeData', () => {
        it('should correctly normalize a Zerodha BUY trade', () => {
            const rawTrade = {
                trade_id: '10000000',
                order_id: '200000000000000',
                exchange: 'NSE',
                tradingsymbol: 'SBIN',
                instrument_token: 779521,
                product: 'CNC',
                average_price: 420.65,
                quantity: 10,
                exchange_order_id: '300000000000000',
                transaction_type: 'BUY',
                fill_timestamp: '2021-05-31 09:16:39',
                order_timestamp: '09:16:39',
                exchange_timestamp: '2021-05-31 09:16:39'
            };

            const normalized = adapter.normalizeTradeData(rawTrade);

            expect(normalized.tradeId).toBe('10000000');
            expect(normalized.orderId).toBe('200000000000000');
            expect(normalized.symbol).toBe('SBIN');
            expect(normalized.exchange).toBe('NSE');
            expect(normalized.instrumentToken).toBe(779521);
            expect(normalized.transactionType).toBe(TransactionType.BUY);
            expect(normalized.quantity).toBe(10);
            expect(normalized.price).toBe(420.65);
            expect(normalized.averagePrice).toBe(420.65);
            expect(normalized.product).toBe(ProductType.CNC);
            expect(normalized.status).toBe(TradeStatus.COMPLETE);
            expect(normalized.exchangeOrderId).toBe('300000000000000');
        });

        it('should correctly normalize a Zerodha SELL trade', () => {
            const rawTrade = {
                trade_id: '20000000',
                order_id: '400000000000000',
                exchange: 'BSE',
                tradingsymbol: 'RELIANCE',
                instrument_token: 738561,
                product: 'MIS',
                average_price: 2150.50,
                quantity: 5,
                exchange_order_id: '500000000000000',
                transaction_type: 'SELL',
                fill_timestamp: '2021-05-31 14:30:00',
                order_timestamp: '14:30:00',
                exchange_timestamp: '2021-05-31 14:30:00'
            };

            const normalized = adapter.normalizeTradeData(rawTrade);

            expect(normalized.transactionType).toBe(TransactionType.SELL);
            expect(normalized.product).toBe(ProductType.MIS);
            expect(normalized.symbol).toBe('RELIANCE');
            expect(normalized.exchange).toBe('BSE');
        });

        it('should correctly parse timestamps', () => {
            const rawTrade = {
                trade_id: '30000000',
                order_id: '600000000000000',
                exchange: 'NSE',
                tradingsymbol: 'TCS',
                instrument_token: 2953217,
                product: 'NRML',
                average_price: 3250.00,
                quantity: 1,
                exchange_order_id: '700000000000000',
                transaction_type: 'BUY',
                fill_timestamp: '2021-05-31 11:45:30',
                order_timestamp: '11:45:30',
                exchange_timestamp: '2021-05-31 11:45:30'
            };

            const normalized = adapter.normalizeTradeData(rawTrade);

            expect(normalized.timestamp).toBeInstanceOf(Date);
            expect(normalized.orderTimestamp).toBeInstanceOf(Date);
            expect(normalized.exchangeTimestamp).toBeInstanceOf(Date);
        });

        it('should include metadata with broker information', () => {
            const rawTrade = {
                trade_id: '40000000',
                order_id: '800000000000000',
                exchange: 'MCX',
                tradingsymbol: 'GOLDPETAL21JUNFUT',
                instrument_token: 58424839,
                product: 'NRML',
                average_price: 4852,
                quantity: 1,
                exchange_order_id: '900000000000000',
                transaction_type: 'BUY',
                fill_timestamp: '2021-05-31 16:00:36',
                order_timestamp: '16:00:36',
                exchange_timestamp: '2021-05-31 16:00:36'
            };

            const normalized = adapter.normalizeTradeData(rawTrade);

            expect(normalized.metadata).toBeDefined();
            expect(normalized.metadata?.broker).toBe('zerodha');
            expect(normalized.metadata?.rawData).toEqual(rawTrade);
        });

        it('should handle different product types', () => {
            const productTypes = ['CNC', 'MIS', 'NRML', 'CO', 'BO'];
            const expectedTypes = [
                ProductType.CNC,
                ProductType.MIS,
                ProductType.NRML,
                ProductType.CO,
                ProductType.BO
            ];

            productTypes.forEach((product, index) => {
                const rawTrade = {
                    trade_id: `${index}0000000`,
                    order_id: '100000000000000',
                    exchange: 'NSE',
                    tradingsymbol: 'TEST',
                    instrument_token: 123456,
                    product,
                    average_price: 100,
                    quantity: 1,
                    exchange_order_id: '200000000000000',
                    transaction_type: 'BUY',
                    fill_timestamp: '2021-05-31 10:00:00',
                    order_timestamp: '10:00:00',
                    exchange_timestamp: '2021-05-31 10:00:00'
                };

                const normalized = adapter.normalizeTradeData(rawTrade);
                expect(normalized.product).toBe(expectedTypes[index]);
            });
        });
    });

    describe('brokerName', () => {
        it('should have correct broker name', () => {
            expect(adapter.brokerName).toBe('zerodha');
        });
    });
});
