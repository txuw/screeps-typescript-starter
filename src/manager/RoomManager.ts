import { RoomConfig } from '../types/RoomConfig';
import { RoomState, RoomStatusInfo, RoomDevelopmentStage } from '../types/RoomState';
import { CreepConfig } from '../types/CreepConfig';
import { LinkManager } from './LinkManager';

/**
 * RoomManager - 管理单个房间的配置、状态和操作
 * 负责房间级别的creep管理、状态监控和配置调整
 */
export class RoomManager {
    private room: Room;
    private config: RoomConfig;
    private statusInfo: RoomStatusInfo;
    private lastStateCheck: number = 0;

    constructor(room: Room, config: RoomConfig) {
        this.room = room;
        this.config = config;
        this.statusInfo = this.initializeRoomStatus();
    }

    /**
     * 获取房间实例
     */
    public getRoom(): Room {
        return this.room;
    }

    /**
     * 获取房间配置
     */
    public getConfig(): RoomConfig {
        return this.config;
    }

    /**
     * 更新房间配置
     */
    public updateConfig(newConfig: Partial<RoomConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.saveConfigToMemory();
    }

    /**
     * 获取房间状态信息
     */
    public getRoomStatus(): RoomStatusInfo {
        return this.statusInfo;
    }

    /**
     * 获取当前房间状态
     */
    public getCurrentState(): RoomState {
        return this.statusInfo.state;
    }

    /**
     * 获取当前配置的creep生产设置
     */
    public getCurrentCreepConfigs(): CreepConfig[] {
        const currentState = this.getCurrentState();
        const stateConfig = this.config.creepProduction.stateBasedConfigs[currentState];

        if (stateConfig) {
            return stateConfig.creepConfigs;
        }

        // 回退到正常状态配置
        return this.config.creepProduction.stateBasedConfigs[RoomState.NORMAL]?.creepConfigs || [];
    }

    /**
     * 检查房间是否启用
     */
    public isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * 检查房间是否允许creep共享
     */
    public allowsCreepSharing(): boolean {
        return this.config.crossRoomConfig.allowCreepSharing;
    }

    /**
     * 获取房间优先级
     */
    public getPriority(): number {
        return this.config.priority;
    }

    /**
     * 更新房间状态
     */
    public updateRoomStatus(): void {
        if (!this.shouldUpdateState()) {
            return;
        }

        this.statusInfo = this.calculateRoomStatus();
        this.lastStateCheck = Game.time;
        this.saveStatusToMemory();

        // 如果状态改变且启用自动适应，调整配置
        if (this.config.stateConfig.autoAdapt) {
            this.adaptConfigToState();
        }
    }

    /**
     * 获取房间的creep列表
     */
    public getRoomCreeps(): Creep[] {
        return Object.values(Game.creeps).filter(creep =>
            creep.memory.homeRoom === this.room.name || creep.room.name === this.room.name
        );
    }

    /**
     * 检查是否需要生产新的creep
     */
    public needsCreepProduction(role: string): boolean {
        const roomCreeps = this.getRoomCreeps();
        const roleCreeps = roomCreeps.filter(creep => creep.memory.role === role);
        const creepConfig = this.getCurrentCreepConfigs().find(config => config.role === role);

        if (!creepConfig) {
            return false;
        }

        return roleCreeps.length < creepConfig.maxCount;
    }

    /**
     * 获取当前生产策略
     */
    public getProductionStrategy(): 'aggressive' | 'conservative' | 'balanced' {
        const currentState = this.getCurrentState();
        const stateConfig = this.config.creepProduction.stateBasedConfigs[currentState];

        return stateConfig?.productionStrategy || 'balanced';
    }

    /**
     * 获取房间Link统计信息
     */
    public getLinkStats(): { total: number; source: number; storage: number } | null {
        const linkManager = LinkManager.getInstance();
        return linkManager.getLinkStats(this.room.name);
    }

    /**
     * 初始化房间状态
     */
    private initializeRoomStatus(): RoomStatusInfo {
        // 尝试从内存恢复状态
        const memory = this.getRoomMemory();
        if (memory.roomStatus && memory.roomStatus.lastUpdated > Game.time - 100) {
            return memory.roomStatus;
        }

        // 否则计算新状态
        return this.calculateRoomStatus();
    }

    /**
     * 计算房间状态
     */
    private calculateRoomStatus(): RoomStatusInfo {
        const controller = this.room.controller;
        const rcl = controller?.level || 0;

        // 计算能量状态
        const energyStored = this.calculateTotalEnergy();
        const energyCapacity = this.room.energyCapacityAvailable || 1;
        const energyPercentage = energyStored / energyCapacity;

        // 检查敌人
        const hasEnemy = this.checkForEnemies();

        // 检查建筑工地
        const constructionSites = this.room.find(FIND_CONSTRUCTION_SITES).length;

        // 检查损坏的建筑
        const damagedStructures = this.room.find(FIND_STRUCTURES, {
            filter: structure => structure.hits < structure.hitsMax
        }).length;

        // 确定发展阶段
        const developmentStage = this.calculateDevelopmentStage(rcl);

        // 确定房间状态
        const state = this.determineRoomState({
            energyPercentage,
            hasEnemy,
            constructionSites,
            damagedStructures,
            rcl,
        });

        return {
            state,
            developmentStage,
            rcl,
            energyStored,
            energyCapacity,
            hasEnemy,
            constructionSites,
            structuresDamaged: damagedStructures,
            lastUpdated: Game.time,
        };
    }

    /**
     * 计算总能量
     */
    private calculateTotalEnergy(): number {
        let totalEnergy = 0;

        // 房间可用能量
        totalEnergy += this.room.energyAvailable;

        // 存储能量
        const storage = this.room.storage;
        if (storage && storage.store[RESOURCE_ENERGY]) {
            totalEnergy += storage.store[RESOURCE_ENERGY];
        }

        // 终端能量
        const terminal = this.room.terminal;
        if (terminal && terminal.store[RESOURCE_ENERGY]) {
            totalEnergy += terminal.store[RESOURCE_ENERGY];
        }

        return totalEnergy;
    }

    /**
     * 检查是否有敌人
     */
    private checkForEnemies(): boolean {
        const enemies = this.room.find(FIND_HOSTILE_CREEPS);
        return enemies.length > 0;
    }

    /**
     * 计算发展阶段
     */
    private calculateDevelopmentStage(rcl: number): RoomDevelopmentStage {
        if (rcl <= 3) return RoomDevelopmentStage.EARLY;
        if (rcl <= 6) return RoomDevelopmentStage.MID;
        return RoomDevelopmentStage.LATE;
    }

    /**
     * 确定房间状态
     */
    private determineRoomState(params: {
        energyPercentage: number;
        hasEnemy: boolean;
        constructionSites: number;
        damagedStructures: number;
        rcl: number;
    }): RoomState {
        const { energyPercentage, hasEnemy, constructionSites, damagedStructures } = params;
        const thresholds = this.config.stateConfig.thresholds;

        // 紧急状态：能量极低
        if (energyPercentage < thresholds.emergencyEnergyThreshold / 100) {
            return RoomState.EMERGENCY;
        }

        // 攻击状态：有敌人
        if (hasEnemy) {
            return RoomState.UNDER_ATTACK;
        }

        // 低能量状态
        if (energyPercentage < thresholds.lowEnergyThreshold / 100) {
            return RoomState.LOW_ENERGY;
        }

        // 发展状态：有建筑工地
        if (constructionSites > thresholds.maxConstructionSites) {
            return RoomState.DEVELOPING;
        }

        // // 重建状态：有很多损坏建筑
        // if (damagedStructures > thresholds.damagedStructuresThreshold) {
        //     return RoomState.REBUILDING;
        // }

        return RoomState.NORMAL;
    }

    /**
     * 检查是否应该更新状态
     */
    private shouldUpdateState(): boolean {
        return Game.time - this.lastStateCheck >= this.config.stateConfig.stateCheckInterval;
    }

    /**
     * 根据状态适应配置
     */
    private adaptConfigToState(): void {
        // 这里可以根据状态动态调整配置
        // 例如，在紧急状态下减少非关键creep的生产
        // 在发展状态下增加建造者数量等

        // 可以触发配置事件或调用特定的适应逻辑
        console.log(`[RoomManager] 房间 ${this.room.name} 状态变更为 ${this.getCurrentState()}，正在适应配置...`);
    }

    /**
     * 获取房间内存
     */
    private getRoomMemory(): any {
        if (!Memory.rooms) {
            Memory.rooms = {};
        }
        if (!Memory.rooms[this.room.name]) {
            Memory.rooms[this.room.name] = {};
        }
        return Memory.rooms[this.room.name];
    }

    /**
     * 保存配置到内存
     */
    private saveConfigToMemory(): void {
        const memory = this.getRoomMemory();
        memory.config = this.config;
    }

    /**
     * 保存状态到内存
     */
    private saveStatusToMemory(): void {
        const memory = this.getRoomMemory();
        memory.roomStatus = this.statusInfo;
    }

    /**
     * 检查房间是否有需要LinkCarry的Link
     */
    public hasWorkForLinkCarry(): boolean {
        // 检查房间是否启用了Link管理
        if (!this.config.linkConfig?.enabled) {
            return false;
        }

        // 获取房间内的Link统计
        const linkStats = this.getLinkStats();
        if (!linkStats || linkStats.source === 0) {
            return false; // 没有Source Link就不需要LinkCarry
        }

        // 检查LinkCarry数量是否足够
        return this.needsCreepProduction('linkCarry');
    }
}
