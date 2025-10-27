import { RoomConfig } from '../types/RoomConfig';
import { RoomStatusInfo } from '../types/RoomState';
import { RoomManager } from '../manager/RoomManager';

/**
 * RoomContext - 房间上下文接口
 * 为角色和工具类提供统一的房间相关数据和配置访问接口
 */
export interface RoomContext {
    // 基础房间信息
    readonly room: Room;
    readonly roomName: string;
    readonly config: RoomConfig;
    readonly statusInfo: RoomStatusInfo;

    // 便捷访问方法
    getCurrentState(): string;
    getRCL(): number;
    isEnabled(): boolean;

    // 配置访问方法
    getCreepConfigs(): any[];
    getTowerConfig(): any;
    getResourceConfig(): any;
    getCacheConfig(): any;

    // 资源访问方法
    getSources(): Source[];
    getContainers(): any[];
    getStorage(): any;
    getTerminal(): any;

    // Creep管理方法
    getRoomCreeps(): Creep[];
    getCreepsByRole(role: string): Creep[];
    countCreepsByRole(role: string): number;

    // 状态检查方法
    needsEnergy(): boolean;
    isUnderAttack(): boolean;
    hasConstructionSites(): boolean;
    needsRepair(): boolean;

    // 工具方法
    findNearest<T>(from: RoomPosition, targets: T[], getPos: (target: T) => RoomPosition): T | null;
    calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number;
}

/**
 * RoomContextImpl - RoomContext的默认实现
 */
export class RoomContextImpl implements RoomContext {
    constructor(
        private roomManager: RoomManager
    ) {}

    get room(): Room {
        return this.roomManager.getRoom();
    }

    get roomName(): string {
        return this.room.name;
    }

    get config(): RoomConfig {
        return this.roomManager.getConfig();
    }

    get statusInfo(): RoomStatusInfo {
        return this.roomManager.getRoomStatus();
    }

    // 便捷访问方法
    getCurrentState(): string {
        return this.statusInfo.state;
    }

    getRCL(): number {
        return this.statusInfo.rcl;
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    // 配置访问方法
    getCreepConfigs(): any[] {
        return this.roomManager.getCurrentCreepConfigs();
    }

    getTowerConfig(): any {
        return this.config.towerConfig;
    }

    getResourceConfig(): any {
        return this.config.resourceConfig;
    }

    getCacheConfig(): any {
        return this.config.cacheConfig;
    }

    // 资源访问方法
    getSources(): Source[] {
        return this.room.find(FIND_SOURCES);
    }

    getContainers(): any[] {
        return this.room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });
    }

    getStorage(): any {
        return this.room.storage;
    }

    getTerminal(): any {
        return this.room.terminal;
    }

    // Creep管理方法
    getRoomCreeps(): Creep[] {
        return this.roomManager.getRoomCreeps();
    }

    getCreepsByRole(role: string): Creep[] {
        return this.getRoomCreeps().filter(creep => creep.memory.role === role);
    }

    countCreepsByRole(role: string): number {
        return this.getCreepsByRole(role).length;
    }

    // 状态检查方法
    needsEnergy(): boolean {
        const energyPercentage = this.statusInfo.energyStored / Math.max(this.statusInfo.energyCapacity, 1);
        return energyPercentage < 0.3; // 30%以下认为需要能量
    }

    isUnderAttack(): boolean {
        return this.statusInfo.hasEnemy;
    }

    hasConstructionSites(): boolean {
        return this.statusInfo.constructionSites > 0;
    }

    needsRepair(): boolean {
        return this.statusInfo.structuresDamaged > 0;
    }

    // 工具方法
    findNearest<T>(from: RoomPosition, targets: T[], getPos: (target: T) => RoomPosition): T | null {
        if (targets.length === 0) {
            return null;
        }

        let nearest = targets[0];
        let minDistance = this.calculateDistance(from, getPos(targets[0]));

        for (let i = 1; i < targets.length; i++) {
            const distance = this.calculateDistance(from, getPos(targets[i]));
            if (distance < minDistance) {
                minDistance = distance;
                nearest = targets[i];
            }
        }

        return nearest;
    }

    calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    // 高级工具方法
    getEnergySources(): (Source | StructureContainer | StructureStorage)[] {
        const sources: (Source | StructureContainer | StructureStorage)[] = [];

        // 添加source
        sources.push(...this.getSources());

        // 添加有能量的容器
        this.getContainers().forEach(container => {
            if (container.store[RESOURCE_ENERGY] > 0) {
                sources.push(container);
            }
        });

        // 添加存储（如果有能量）
        const storage = this.getStorage();
        if (storage && storage.store[RESOURCE_ENERGY] > 1000) { // 存储需要有足够能量才作为来源
            sources.push(storage);
        }

        return sources;
    }

    getEnergyTargets(): (Structure | StructureContainer | StructureStorage)[] {
        const targets: (Structure | StructureContainer | StructureStorage)[] = [];

        // 添加需要能量的建筑
        const structuresNeedingEnergy = this.room.find(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_EXTENSION ||
                    structure.structureType === STRUCTURE_SPAWN ||
                    structure.structureType === STRUCTURE_TOWER) {
                    return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
                return false;
            }
        });

        targets.push(...structuresNeedingEnergy);

        // 添加空容器
        this.getContainers().forEach(container => {
            if (container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                targets.push(container);
            }
        });

        // 添加存储（如果空间充足）
        const storage = this.getStorage();
        if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 100000) {
            targets.push(storage);
        }

        return targets;
    }

    // 日志和调试方法
    log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const prefix = `[${this.roomName}][${level.toUpperCase()}]`;
        console.log(`${prefix} ${message}`);
    }

    getDebugInfo(): any {
        return {
            roomName: this.roomName,
            rcl: this.getRCL(),
            state: this.getCurrentState(),
            energyStored: this.statusInfo.energyStored,
            energyCapacity: this.statusInfo.energyCapacity,
            creepCount: this.getRoomCreeps().length,
            hasEnemy: this.isUnderAttack(),
            constructionSites: this.statusInfo.constructionSites,
            structuresDamaged: this.statusInfo.structuresDamaged,
        };
    }
}

/**
 * RoomContextFactory - RoomContext工厂类
 */
export class RoomContextFactory {
    /**
     * 从RoomManager创建RoomContext
     */
    static fromRoomManager(roomManager: RoomManager): RoomContext {
        return new RoomContextImpl(roomManager);
    }

    /**
     * 从房间名称创建RoomContext（如果可能）
     */
    static fromRoomName(roomName: string): RoomContext | null {
        const room = Game.rooms[roomName];
        if (!room) {
            return null;
        }

        // 这里需要获取RoomManager，暂时返回null
        // 在实际使用中，应该通过某种方式获取RoomManager实例
        return null;
    }

    /**
     * 从creep创建RoomContext
     */
    static fromCreep(creep: Creep): RoomContext | null {
        return this.fromRoomName(creep.room.name);
    }
}