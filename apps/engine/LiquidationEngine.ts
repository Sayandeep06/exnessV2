import type { Position, User, LiquidationEvent } from './types';
import { TradingEngine } from './TradingEngine';

export interface LiquidationConfig {
    warning_threshold: number;      
    margin_call_threshold: number;  
    liquidation_threshold: number;  
    emergency_threshold: number;    
    
    price_buffer_percentage: number; 
    fast_market_multiplier: number;  
    
    max_slippage: number;           
    partial_liquidation_ratio: number; 
}

export class LiquidationEngine {
    private config: LiquidationConfig;
    private warningsIssued: Set<string> = new Set();
    private marginCallsIssued: Set<string> = new Set();
    private liquidationQueue: Position[] = [];
    private isProcessingLiquidations = false;
    
    constructor() {
        this.config = {
            warning_threshold: 0.30,        
            margin_call_threshold: 0.20,    
            liquidation_threshold: 0.10,    
            emergency_threshold: 0.05,      
            price_buffer_percentage: 0.005, 
            fast_market_multiplier: 2.0,
            max_slippage: 0.01,             
            partial_liquidation_ratio: 0.5  
        };
        
        this.startLiquidationMonitoring();
    }
    
    checkPositionRisk(position: Position, currentPrice: number, marketVolatility: number = 1.0): void {
        if (position.status !== 'open') return;
        
        const enhancedLiquidationPrice = this.calculateEnhancedLiquidationPrice(
            position, 
            marketVolatility
        );
        
        position.current_price = currentPrice;
        position.unrealized_pnl = this.calculateUnrealizedPnL(position);
        position.margin_ratio = (position.margin + position.unrealized_pnl) / position.position_size;
        
        if (position.margin_ratio <= this.config.emergency_threshold) {
            this.emergencyLiquidation(position);
        } else if (position.margin_ratio <= this.config.liquidation_threshold) {
            this.queueForLiquidation(position);
        } else if (position.margin_ratio <= this.config.margin_call_threshold) {
            this.issueMarginCall(position);
        } else if (position.margin_ratio <= this.config.warning_threshold) {
            this.issueWarning(position);
        }
        
        const shouldLiquidateByPrice = this.shouldLiquidateByPrice(position, currentPrice, enhancedLiquidationPrice);
        if (shouldLiquidateByPrice) {
            this.queueForLiquidation(position);
        }
    }
    
    private calculateEnhancedLiquidationPrice(position: Position, marketVolatility: number): number {
        const baseBuffer = this.config.price_buffer_percentage;
        const volatilityAdjustedBuffer = baseBuffer * (marketVolatility > 1.5 ? this.config.fast_market_multiplier : 1.0);
        
        if (position.side === 'long') {
            return position.liquidation_price * (1 + volatilityAdjustedBuffer);
        } else {
            return position.liquidation_price * (1 - volatilityAdjustedBuffer);
        }
    }
    
    private shouldLiquidateByPrice(position: Position, currentPrice: number, enhancedLiquidationPrice: number): boolean {
        if (position.side === 'long') {
            return currentPrice <= enhancedLiquidationPrice;
        } else {
            return currentPrice >= enhancedLiquidationPrice;
        }
    }
    
    private issueWarning(position: Position): void {
        if (this.warningsIssued.has(position.positionId)) return;
        
        this.warningsIssued.add(position.positionId);
        console.log(`⚠️  WARNING: Position ${position.positionId} has low margin ratio: ${(position.margin_ratio * 100).toFixed(1)}%`);
        
        this.broadcastLiquidationWarning(position, 'warning');
    }
    
    private issueMarginCall(position: Position): void {
        if (this.marginCallsIssued.has(position.positionId)) return;
        
        this.marginCallsIssued.add(position.positionId);
        console.log(`🚨 MARGIN CALL: Position ${position.positionId} margin ratio: ${(position.margin_ratio * 100).toFixed(1)}%`);
        
        this.broadcastLiquidationWarning(position, 'margin_call');
    }
    
    private queueForLiquidation(position: Position): void {
        if (this.liquidationQueue.find(p => p.positionId === position.positionId)) return;
        
        this.liquidationQueue.push(position);
        console.log(`🔥 QUEUED FOR LIQUIDATION: Position ${position.positionId} margin ratio: ${(position.margin_ratio * 100).toFixed(1)}%`);
        
        this.liquidationQueue.sort((a, b) => a.margin_ratio - b.margin_ratio);
        
        this.processLiquidationQueue();
    }
    
    private emergencyLiquidation(position: Position): void {
        console.log(`🚨 EMERGENCY LIQUIDATION: Position ${position.positionId} margin ratio: ${(position.margin_ratio * 100).toFixed(1)}%`);
        
        this.executeLiquidation(position, true);
    }
    
    private async processLiquidationQueue(): Promise<void> {
        if (this.isProcessingLiquidations || this.liquidationQueue.length === 0) return;
        
        this.isProcessingLiquidations = true;
        
        try {
            while (this.liquidationQueue.length > 0) {
                const position = this.liquidationQueue.shift()!;
                
                if (position.status === 'open' && position.margin_ratio <= this.config.liquidation_threshold) {
                    await this.executeLiquidation(position, false);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } finally {
            this.isProcessingLiquidations = false;
        }
    }
    
    private async executeLiquidation(position: Position, isEmergency: boolean): Promise<void> {
        try {
            const shouldPartialLiquidate = !isEmergency && 
                position.position_size > 50000 && 
                position.margin_ratio > this.config.emergency_threshold;
                
            if (shouldPartialLiquidate) {
                await this.executePartialLiquidation(position);
            } else {
                await this.executeFullLiquidation(position);
            }
            
            this.warningsIssued.delete(position.positionId);
            this.marginCallsIssued.delete(position.positionId);
            
        } catch (error) {
            console.error(`Error executing liquidation for ${position.positionId}:`, error);
        }
    }
    
    private async executePartialLiquidation(position: Position): Promise<void> {
        const liquidationRatio = this.config.partial_liquidation_ratio;
        const liquidationQuantity = position.quantity * liquidationRatio;
        const remainingQuantity = position.quantity * (1 - liquidationRatio);
        
        console.log(`🔥 PARTIAL LIQUIDATION: ${position.positionId} - Liquidating ${(liquidationRatio * 100).toFixed(0)}%`);
        
        const pnlPerUnit = (position.current_price - position.entry_price) * (position.side === 'long' ? 1 : -1);
        const liquidatedPnL = pnlPerUnit * liquidationQuantity;
        const liquidationFee = (liquidationQuantity * position.current_price) * 0.005; 
        const netLiquidatedPnL = liquidatedPnL - liquidationFee;
        
        position.quantity = remainingQuantity;
        position.position_size = position.position_size * (1 - liquidationRatio);
        position.margin = position.margin * (1 - liquidationRatio);
        position.realized_pnl += netLiquidatedPnL;
        
        position.unrealized_pnl = this.calculateUnrealizedPnL(position);
        position.margin_ratio = (position.margin + position.unrealized_pnl) / position.position_size;
        
        console.log(`   Remaining position: ${(remainingQuantity * position.current_price).toFixed(0)} USD`);
        console.log(`   New margin ratio: ${(position.margin_ratio * 100).toFixed(1)}%`);
    }
    
    private async executeFullLiquidation(position: Position): Promise<void> {
        console.log(`🔥 FULL LIQUIDATION: ${position.positionId}`);
        
        const finalPnL = position.unrealized_pnl;
        const liquidationFee = position.position_size * 0.005; 
        const netPnL = finalPnL - liquidationFee;
        const remainingMargin = Math.max(0, position.margin + netPnL);
        const marginLost = position.margin - remainingMargin;
        
        position.status = 'liquidated';
        position.realized_pnl = finalPnL;
        position.closed_at = new Date();
        
        const liquidationEvent: LiquidationEvent = {
            positionId: position.positionId,
            userId: position.userId,
            symbol: position.symbol,
            liquidation_price: position.current_price,
            margin_lost: marginLost,
            timestamp: new Date(),
            reason: 'margin_call'
        };
        
        console.log(`   Margin lost: $${marginLost.toFixed(2)}`);
        console.log(`   Liquidation fee: $${liquidationFee.toFixed(2)}`);
        console.log(`   Remaining margin: $${remainingMargin.toFixed(2)}`);
        
        this.broadcastLiquidationEvent(liquidationEvent);
    }
    
    private calculateUnrealizedPnL(position: Position): number {
        const price_difference = position.side === 'long' 
            ? position.current_price - position.entry_price
            : position.entry_price - position.current_price;
            
        return price_difference * position.quantity;
    }
    
    private startLiquidationMonitoring(): void {
        setInterval(() => {
            
            
        }, 1000); 
    }
    
    private broadcastLiquidationWarning(position: Position, type: 'warning' | 'margin_call'): void {
        const message = {
            type: `liquidation_${type}`,
            data: {
                positionId: position.positionId,
                userId: position.userId,
                symbol: position.symbol,
                margin_ratio: position.margin_ratio,
                current_price: position.current_price,
                liquidation_price: position.liquidation_price,
                unrealized_pnl: position.unrealized_pnl,
                timestamp: new Date()
            }
        };
        
        
        console.log(`Broadcasting ${type}:`, message);
    }
    
    private broadcastLiquidationEvent(liquidationEvent: LiquidationEvent): void {
        const message = {
            type: 'liquidation',
            data: liquidationEvent
        };
        
        
        console.log('Broadcasting liquidation:', message);
    }
    
    getStatistics(): any {
        return {
            active_warnings: this.warningsIssued.size,
            active_margin_calls: this.marginCallsIssued.size,
            liquidation_queue_length: this.liquidationQueue.length,
            is_processing: this.isProcessingLiquidations,
            config: this.config
        };
    }
    
    updateConfig(newConfig: Partial<LiquidationConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('Liquidation config updated:', this.config);
    }
}