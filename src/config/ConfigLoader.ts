import { RoomConfig } from '../types/RoomConfig';
import { GLOBAL_ROOM_THRESHOLDS } from './GlobalConstants';
import { createRoomConfig, adjustConfigByRCL } from './BaseRoomConfig';
import { W1N1_CONFIG } from './rooms/W1N1';
import { W2N1_CONFIG } from './rooms/W2N1';
import { W2N2_CONFIG } from './rooms/W2N2';
import { W5N3_CONFIG } from './rooms/W5N3';
import { RoomState } from '../types/RoomState';

/**
 * ConfigLoader - 配置加载和管理器
 * 负责加载房间配置，处理配置继承和回退逻辑
 */
export class ConfigLoader {
    private static instance: ConfigLoader;
    private configCache: Map<string, RoomConfig> = new Map();
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): ConfigLoader {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    }

    /**
     * 初始化配置加载器
     */
    public initialize(): void {
        if (this.isInitialized) {
            return;
        }

        console.log('[ConfigLoader] 初始化配置加载器...');

        // 预加载已知房间配置
        this.preloadKnownConfigs();

        this.isInitialized = true;
        console.log('[ConfigLoader] 配置加载器初始化完成');
    }

    /**
     * 获取房间配置
     */
    public getRoomConfig(roomName: string, room?: Room): RoomConfig {
        // 检查缓存
        if (this.configCache.has(roomName)) {
            return this.configCache.get(roomName)!;
        }

        // 尝试加载特定房间配置
        let config = this.loadSpecificRoomConfig(roomName);

        // 如果没有特定配置，创建默认配置
        if (!config) {
            config = this.createDefaultRoomConfig(roomName);
        }

        // 如果提供了room对象，根据RCL调整配置
        if (room) {
            config = adjustConfigByRCL(config, room.controller?.level || 1);
        }

        // 缓存配置
        this.configCache.set(roomName, config);

        return config;
    }

    /**
     * 重新加载配置
     */
    public reloadConfig(roomName: string): RoomConfig {
        this.configCache.delete(roomName);
        return this.getRoomConfig(roomName);
    }

    /**
     * 获取所有已加载的房间配置
     */
    public getAllLoadedConfigs(): Map<string, RoomConfig> {
        return new Map(this.configCache);
    }

    /**
     * 检查是否有房间配置
     */
    public hasRoomConfig(roomName: string): boolean {
        return this.configCache.has(roomName) || this.hasSpecificRoomConfig(roomName);
    }

    /**
     * 预加载已知房间配置
     */
    private preloadKnownConfigs(): void {
        // 预加载W1N1配置
        this.configCache.set('W1N1', W1N1_CONFIG);
        this.configCache.set('W2N1', W2N1_CONFIG);
        this.configCache.set('W2N2', W2N2_CONFIG);
        this.configCache.set('W5N3', W5N3_CONFIG);

        // 预加载内存中保存的配置
        this.loadConfigsFromMemory();
    }

    /**
     * 加载特定房间配置
     */
    private loadSpecificRoomConfig(roomName: string): RoomConfig | null {
        // 这里可以根据房间名称动态加载配置
        // 例如，从外部配置文件或从其他源加载

        switch (roomName) {
            case 'W1N1':
                return W1N1_CONFIG;
            case 'W2N1':
                return W2N1_CONFIG;
            case 'W2N2':
              return  W2N2_CONFIG;
            case 'W5N3':
              return  W5N3_CONFIG;
            // 可以添加更多房间的配置
            default:
                return null;
        }
    }

    /**
     * 检查是否有特定房间配置文件
     */
    private hasSpecificRoomConfig(roomName: string): boolean {
        // 检查是否有对应的配置文件
        // 在实际环境中，可以检查文件系统或其他配置源
        return roomName === 'W1N1' || roomName === 'W2N1' || roomName === 'W2N2' || roomName === 'W5N3'; // 目前只有W1N1有特定配置
    }

    /**
     * 创建默认房间配置
     */
    private createDefaultRoomConfig(roomName: string): RoomConfig {
        console.log(`[ConfigLoader] 为房间 ${roomName} 创建默认配置`);

        const defaultConfig = createRoomConfig(roomName, {
            priority: 5, // 默认房间优先级较低

            // 为新房间设置保守的creep配置
            creepProduction: {
                enabled: true,
                maxTotalCreeps: 10, // 较少的creep数量
                productionPriority: 5, // 较低的生产优先级
                stateBasedConfigs: {
                    [RoomState.NORMAL]: {
                        creepConfigs: [
                            {
                                role: 'harvester',
                                body: [WORK, CARRY, MOVE],
                                maxCount: 3,
                                priority: 1,
                                needLength: 3,
                            },
                            {
                                role: 'upgrader',
                                body: [WORK, CARRY, MOVE],
                                maxCount: 2,
                                priority: 2,
                                needLength: 2,
                            },
                            {
                                role: 'builder',
                                body: [WORK, CARRY, MOVE],
                                maxCount: 1,
                                priority: 3,
                                needLength: 1,
                            },
                        ],
                        productionStrategy: 'conservative',
                    },
                    [RoomState.EMERGENCY]: {
                        creepConfigs: [
                            {
                                role: 'harvester',
                                body: [WORK, CARRY, MOVE],
                                maxCount: 1,
                                priority: 1,
                                needLength: 1,
                            },
                        ],
                        productionStrategy: 'conservative',
                    },
                },
            },

            // 新房间默认不启用塔防（可能还没有塔）
            towerConfig: {
                enabled: false,
                repairThreshold: 0.8,
                defenseMode: {
                    enabled: true,
                    minHitsToAttack: 1000,
                    allyWhitelist: [],
                },
                repairPriorities: [
                    STRUCTURE_RAMPART,
                    STRUCTURE_WALL,
                    STRUCTURE_SPAWN,
                    STRUCTURE_EXTENSION,
                    STRUCTURE_TOWER,
                    STRUCTURE_STORAGE,
                    STRUCTURE_CONTAINER,
                    STRUCTURE_ROAD,
                ],
            },

            // 跨房间配置 - 新房间默认不参与creep共享
            crossRoomConfig: {
                allowCreepSharing: false,
                sharingPriority: 10,
                maxSharedCreeps: 0,
            },
        });

        return defaultConfig;
    }

    /**
     * 从内存加载配置
     */
    private loadConfigsFromMemory(): void {
        if (!Memory.rooms) {
            return;
        }

        Object.entries(Memory.rooms).forEach(([roomName, roomMemory]: [string, any]) => {
            if (roomMemory.config) {
                try {
                    // 验证配置是否有效
                    const config = roomMemory.config as RoomConfig;
                    if (config.roomName === roomName) {
                        this.configCache.set(roomName, config);
                        console.log(`[ConfigLoader] 从内存加载了房间 ${roomName} 的配置`);
                    }
                } catch (error) {
                    console.error(`[ConfigLoader] 加载房间 ${roomName} 配置失败:`, error);
                }
            }
        });
    }
    /**
     * 清理配置缓存
     */
    public clearCache(): void {
        this.configCache.clear();
        console.log('[ConfigLoader] 配置缓存已清理');
    }

    /**
     * 获取配置统计信息
     */
    public getConfigStats(): {
        totalConfigs: number;
        specificConfigs: number;
        defaultConfigs: number;
        cachedConfigs: string[];
    } {
        const stats = {
            totalConfigs: this.configCache.size,
            specificConfigs: 0,
            defaultConfigs: 0,
            cachedConfigs: Array.from(this.configCache.keys()),
        };

        // 统计特定配置和默认配置
        this.configCache.forEach((config, roomName) => {
            if (this.hasSpecificRoomConfig(roomName)) {
                stats.specificConfigs++;
            } else {
                stats.defaultConfigs++;
            }
        });

        return stats;
    }
}
