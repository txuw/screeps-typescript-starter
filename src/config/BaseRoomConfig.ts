import { RoomConfig, TerminalConfig } from '../types/RoomConfig';
import { CreepConfig } from '../types/CreepConfig';
import { GLOBAL_ALGORITHM_CONFIG, GLOBAL_ROOM_THRESHOLDS, ROLE_NAMES } from './GlobalConstants';
import { RoomState } from '../types/RoomState';

// 基础Creep配置模板
export const BASE_CREEP_CONFIGS: CreepConfig[] = [
    // 采集者
    {
        role: ROLE_NAMES.HARVESTER,
        body: [WORK, CARRY, MOVE],
        maxCount: 4,
        priority: 10,
        needLength: 4,
    },
    // Link运输者
    {
        role: ROLE_NAMES.LINK_CARRY,
        body: [CARRY, CARRY, MOVE, MOVE],
        maxCount: 2,
        priority: 1, // 最高优先级
        needLength: 2,
    },
    // 建造者
    {
        role: ROLE_NAMES.BUILDER,
        body: [WORK, CARRY, MOVE],
        maxCount: 6,
        priority: 8,
        needLength: 6,
    },
    // 升级者
    {
        role: ROLE_NAMES.UPGRADER,
        body: [WORK, CARRY, MOVE],
        maxCount: 4,
        priority: 9,
        needLength: 4,
    },
    // 运输者
    {
        role: ROLE_NAMES.CARRY,
        body: [CARRY, CARRY, MOVE, MOVE],
        maxCount: 4,
        priority: 7,
        needLength: 4,
    },
    // 容器运输者
    {
        role: ROLE_NAMES.CONTAINER_CARRY,
        body: [CARRY, CARRY, MOVE, MOVE],
        maxCount: 2,
        priority: 6,
        needLength: 2,
    },
    // 存储运输者
    {
        role: ROLE_NAMES.STORAGE_CARRY,
        body: [CARRY, CARRY, MOVE, MOVE],
        maxCount: 2,
        priority: 5,
        needLength: 2,
    },
    // 探索者
    {
        role: ROLE_NAMES.CLAIMER,
        body: [], // 将由ClaimerUtils.generateClaimerBody动态生成
        maxCount: 1,
        priority: 4, // 中等优先级
        needLength: 1,
    },
    // 跨房间建造者
    {
        role: ROLE_NAMES.CROSS_ROOM_BUILDER,
        body: [], // 将由CrossRoomUtils.generateCrossRoomBuilderBody动态生成
        maxCount: 0, // 默认关闭，按需配置
        priority: 3, // 较高优先级
        needLength: 1,
    },
    // 跨房间升级者
    {
        role: ROLE_NAMES.CROSS_ROOM_UPGRADER,
        body: [], // 将由CrossRoomUtils.generateCrossRoomUpgraderBody动态生成
        maxCount: 0, // 默认关闭，按需配置
        priority: 2, // 较高优先级
        needLength: 1,
    },
    // Lab搬运者
    {
        role: ROLE_NAMES.LAB_CARRY,
        body: [CARRY, CARRY, MOVE, MOVE],
        maxCount: 0, // 默认关闭，在有Lab配置的房间启用
        priority: 6,
        needLength: 1,
    },
];

// 基础房间配置模板
export const BASE_ROOM_CONFIG: Omit<RoomConfig, 'roomName'> = {
    enabled: true,
    priority: 1,

    // 房间状态配置
    stateConfig: {
        autoAdapt: true,
        stateCheckInterval: GLOBAL_ROOM_THRESHOLDS.STATE_CHECK_INTERVAL_DEFAULT,
        thresholds: {
            lowEnergyThreshold: GLOBAL_ROOM_THRESHOLDS.LOW_ENERGY_DEFAULT,
            emergencyEnergyThreshold: GLOBAL_ROOM_THRESHOLDS.EMERGENCY_ENERGY_DEFAULT,
            maxConstructionSites: GLOBAL_ROOM_THRESHOLDS.MAX_CONSTRUCTION_SITES_DEFAULT,
            damagedStructuresThreshold: GLOBAL_ROOM_THRESHOLDS.DAMAGED_STRUCTURES_THRESHOLD_DEFAULT,
        },
    },

    // Creep生产配置
    creepProduction: {
        enabled: true,
        maxTotalCreeps: 20,
        productionPriority: 1,
        stateBasedConfigs: {
            [RoomState.NORMAL]: {
                creepConfigs: BASE_CREEP_CONFIGS,
                productionStrategy: 'balanced',
            },
            [RoomState.DEVELOPING]: {
                creepConfigs: BASE_CREEP_CONFIGS.map(config => ({
                    ...config,
                    maxCount: config.role === ROLE_NAMES.BUILDER ? config.maxCount * 1.5 : config.maxCount,
                })),
                productionStrategy: 'aggressive',
            },
            [RoomState.LOW_ENERGY]: {
                creepConfigs: BASE_CREEP_CONFIGS.filter(config =>
                    config.role === ROLE_NAMES.HARVESTER || config.role === ROLE_NAMES.CARRY
                ),
                productionStrategy: 'conservative',
            },
            [RoomState.UNDER_ATTACK]: {
                creepConfigs: BASE_CREEP_CONFIGS.map(config => ({
                    ...config,
                    maxCount: config.role === ROLE_NAMES.BUILDER ? Math.floor(config.maxCount * 0.5) : config.maxCount,
                })),
                productionStrategy: 'conservative',
            },
            [RoomState.EMERGENCY]: {
                creepConfigs: BASE_CREEP_CONFIGS.filter(config =>
                    config.role === ROLE_NAMES.HARVESTER
                ).map(config => ({
                    ...config,
                    maxCount: Math.min(config.maxCount, 2),
                })),
                productionStrategy: 'conservative',
            },
        },
    },

    // 塔防配置
    towerConfig: {
        enabled: true,
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

    // 资源管理配置
    resourceConfig: {
        sourceAllocation: {
            enableDynamicAllocation: true,
            maxWorkersPerSource: GLOBAL_ALGORITHM_CONFIG.MAX_WORKER_COUNT,
            distanceFactor: GLOBAL_ALGORITHM_CONFIG.DISTANCE_FACTOR,
        },
        containerManagement: {
            enableRoundRobin: true,
            maxTransferDistance: 10,
        },
        storageManagement: {
            enableStorageLogic: true,
            minEnergyForUpgrade: 100000,
        },
        linkManagement: {
            enabled: true,
            transferInterval: 3,
            sourceTransferThreshold: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.SOURCE_LINK_THRESHOLD,
            storageTransferThreshold: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.STORAGE_LINK_THRESHOLD,
            minEnergyToTransfer: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.MIN_ENERGY_TO_TRANSFER,
        },
    },

    // Link网络配置
    linkConfig: {
        enabled: true,
        transferInterval: 3,
        sourceTransferThreshold: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.SOURCE_LINK_THRESHOLD,
        storageTransferThreshold: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.STORAGE_LINK_THRESHOLD,
        minEnergyToTransfer: GLOBAL_ALGORITHM_CONFIG.LINK_CONFIG.MIN_ENERGY_TO_TRANSFER,
    },

    // 缓存配置
    cacheConfig: {
        enableCache: true,
        cacheDuration: GLOBAL_ALGORITHM_CONFIG.DEFAULT_CACHE_DURATION,
    },

    // 跨房间配置
    crossRoomConfig: {
        allowCreepSharing: false,
        sharingPriority: 5,
        maxSharedCreeps: 2,
        claimTargets: [], // 将在具体房间配置中设置目标房间
        enableClaiming: false, // 默认关闭，在需要时启用

        // 跨房间建造配置
        buildTargets: [], // 将在具体房间配置中设置建造目标
        upgradeTargets: [], // 将在具体房间配置中设置升级目标

        // 跨房间creep配置
        maxCrossRoomBuilders: 0, // 默认关闭
        maxCrossRoomUpgraders: 0, // 默认关闭
        crossRoomEnabled: false, // 默认关闭跨房间功能
        minEnergyForCrossRoom: GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.MIN_ENERGY_FOR_CROSS_ROOM,
    },

    // Terminal配置
    terminalConfig: {
        enabled: false, // 默认关闭
        terminalConfigs: [], // 默认为空数组
    },

    // Lab配置
    labConfig: {
        enabled: false, // 默认关闭
        labs: {}, // 默认为空对象
    },

    // 特殊配置
    specialConfig: {
        enableEmergencyMode: true,
        enableRebuildingMode: false,
        customStrategies: [],
    },
};

// 创建房间配置的工厂函数
export function createRoomConfig(roomName: string, overrides?: Partial<RoomConfig>): RoomConfig {
    return {
        ...BASE_ROOM_CONFIG,
        roomName,
        ...overrides,
    };
}

// 根据RCL等级调整配置的函数
export function adjustConfigByRCL(config: RoomConfig, rcl: number): RoomConfig {
    const adjustedConfig = { ...config };

    // 根据RCL调整creep配置
    if (rcl <= 3) {
        // 早期RCL：减少高级creep，增加基础采集
        adjustedConfig.creepProduction.stateBasedConfigs[RoomState.NORMAL]?.creepConfigs.forEach(creepConfig => {
            if (creepConfig.role === ROLE_NAMES.HARVESTER) {
                creepConfig.maxCount = Math.max(creepConfig.maxCount, 1);
            } else if (creepConfig.role === ROLE_NAMES.STORAGE_CARRY) {
                creepConfig.maxCount = 0; // 早期不需要存储运输
            }
        });
    } else if (rcl >= 6) {
        // 高级RCL：可以增加更多creep
        adjustedConfig.creepProduction.maxTotalCreeps = Math.min(adjustedConfig.creepProduction.maxTotalCreeps * 1.5, 30);
    }

    return adjustedConfig;
}
