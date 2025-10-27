import { RoomContext } from './RoomContext';
import { RoomManager } from '../manager/RoomManager';
import { ConfigLoader } from '../config/ConfigLoader';

/**
 * RoomContextManager - 管理RoomContext实例和分配
 * 提供全局的RoomContext访问和管理
 */
export class RoomContextManager {
    private static instance: RoomContextManager;
    private roomManagers: Map<string, RoomManager> = new Map();
    private roomContexts: Map<string, RoomContext> = new Map();
    private configLoader: ConfigLoader;

    private constructor() {
        this.configLoader = ConfigLoader.getInstance();
    }

    public static getInstance(): RoomContextManager {
        if (!RoomContextManager.instance) {
            RoomContextManager.instance = new RoomContextManager();
        }
        return RoomContextManager.instance;
    }

    /**
     * 初始化管理器
     */
    public initialize(): void {
        console.log('[RoomContextManager] 初始化房间上下文管理器...');
        this.configLoader.initialize();
        console.log('[RoomContextManager] 初始化完成');
    }

    /**
     * 获取或创建房间管理器
     */
    public getRoomManager(roomName: string): RoomManager | null {
        // 检查缓存
        if (this.roomManagers.has(roomName)) {
            return this.roomManagers.get(roomName)!;
        }

        // 获取房间对象
        const room = Game.rooms[roomName];
        if (!room) {
            return null;
        }

        // 获取房间配置
        const config = this.configLoader.getRoomConfig(roomName, room);
        if (!config.enabled) {
            return null;
        }

        // 创建房间管理器
        const roomManager = new RoomManager(room, config);
        this.roomManagers.set(roomName, roomManager);

        console.log(`[RoomContextManager] 创建房间管理器: ${roomName}`);
        return roomManager;
    }

    /**
     * 获取房间的RoomContext
     */
    public getRoomContext(roomName: string): RoomContext | null {
        // 检查缓存
        if (this.roomContexts.has(roomName)) {
            return this.roomContexts.get(roomName)!;
        }

        // 获取房间管理器
        const roomManager = this.getRoomManager(roomName);
        if (!roomManager) {
            return null;
        }

        // 创建RoomContext
        import('./RoomContext').then(({ RoomContextImpl }) => {
            const context = new RoomContextImpl(roomManager);
            this.roomContexts.set(roomName, context);
        });

        return null; // 异步创建，暂时返回null
    }

    /**
     * 同步获取RoomContext（推荐使用）
     */
    public getRoomContextSync(roomName: string): RoomContext | null {
        // 检查缓存
        if (this.roomContexts.has(roomName)) {
            return this.roomContexts.get(roomName)!;
        }

        // 获取房间管理器
        const roomManager = this.getRoomManager(roomName);
        if (!roomManager) {
            return null;
        }

        // 同步创建RoomContext
        const { RoomContextImpl } = require('./RoomContext');
        const context = new RoomContextImpl(roomManager);
        this.roomContexts.set(roomName, context);

        return context;
    }

    /**
     * 为creep获取RoomContext
     */
    public getRoomContextForCreep(creep: Creep): RoomContext | null {
        const roomName = creep.room.name;
        return this.getRoomContextSync(roomName);
    }

    /**
     * 更新房间状态（在每个tick调用）
     */
    public updateAllRoomStates(): void {
        for (const [roomName, roomManager] of this.roomManagers) {
            try {
                roomManager.updateRoomStatus();
            } catch (error) {
                console.error(`[RoomContextManager] 更新房间 ${roomName} 状态失败:`, error);
            }
        }
    }

    /**
     * 清理不存在的房间
     */
    public cleanupInvalidRooms(): void {
        const roomsToRemove: string[] = [];

        // 检查房间管理器
        for (const roomName of this.roomManagers.keys()) {
            if (!Game.rooms[roomName]) {
                roomsToRemove.push(roomName);
            }
        }

        // 清理
        for (const roomName of roomsToRemove) {
            this.roomManagers.delete(roomName);
            this.roomContexts.delete(roomName);
            console.log(`[RoomContextManager] 清理不存在的房间: ${roomName}`);
        }
    }

    /**
     * 获取所有启用的房间名称
     */
    public getEnabledRoomNames(): string[] {
        return Array.from(this.roomManagers.keys());
    }

    /**
     * 检查房间是否启用
     */
    public isRoomEnabled(roomName: string): boolean {
        return this.roomManagers.has(roomName);
    }

    /**
     * 重新加载房间配置
     */
    public reloadRoomConfig(roomName: string): boolean {
        try {
            // 清理缓存
            this.roomManagers.delete(roomName);
            this.roomContexts.delete(roomName);

            // 重新获取
            const roomManager = this.getRoomManager(roomName);
            return roomManager !== null;
        } catch (error) {
            console.error(`[RoomContextManager] 重新加载房间 ${roomName} 配置失败:`, error);
            return false;
        }
    }

    /**
     * 获取房间统计信息
     */
    public getRoomStats(): { [roomName: string]: any } {
        const stats: { [roomName: string]: any } = {};

        for (const [roomName, roomManager] of this.roomManagers) {
            const status = roomManager.getRoomStatus();
            const config = roomManager.getConfig();

            stats[roomName] = {
                rcl: status.rcl,
                state: status.state,
                energyStored: status.energyStored,
                energyCapacity: status.energyCapacity,
                hasEnemy: status.hasEnemy,
                constructionSites: status.constructionSites,
                structuresDamaged: status.structuresDamaged,
                priority: config.priority,
                enabled: config.enabled,
                creepCount: roomManager.getRoomCreeps().length,
                lastUpdated: status.lastUpdated,
            };
        }

        return stats;
    }

    /**
     * 清理所有缓存
     */
    public clearAllCache(): void {
        this.roomManagers.clear();
        this.roomContexts.clear();
        console.log('[RoomContextManager] 已清理所有缓存');
    }

    /**
     * 获取管理器统计信息
     */
    public getManagerStats(): {
        totalRooms: number;
        enabledRooms: number;
        cachedContexts: number;
        roomsList: string[];
    } {
        return {
            totalRooms: Object.keys(Game.rooms).length,
            enabledRooms: this.roomManagers.size,
            cachedContexts: this.roomContexts.size,
            roomsList: Array.from(this.roomManagers.keys()),
        };
    }

    /**
     * 全局日志输出
     */
    public log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const prefix = `[RoomContextManager][${level.toUpperCase()}]`;
        console.log(`${prefix} ${message}`);
    }

    /**
     * 健康检查
     */
    public performHealthCheck(): {
        healthy: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // 检查是否有启用的房间
        if (this.roomManagers.size === 0) {
            issues.push('没有启用的房间管理器');
            recommendations.push('检查房间配置是否正确');
        }

        // 检查creep数量
        let totalCreeps = 0;
        for (const roomManager of this.roomManagers.values()) {
            totalCreeps += roomManager.getRoomCreeps().length;
        }

        if (totalCreeps === 0 && this.roomManagers.size > 0) {
            issues.push('有启用的房间但没有creep');
            recommendations.push('检查creep生产配置');
        }

        // 检查内存使用
        const memoryUsage = JSON.stringify(Memory).length;
        if (memoryUsage > 1000000) { // 1MB
            issues.push(`内存使用过高: ${Math.round(memoryUsage / 1024)}KB`);
            recommendations.push('清理过期内存数据');
        }

        return {
            healthy: issues.length === 0,
            issues,
            recommendations,
        };
    }
}