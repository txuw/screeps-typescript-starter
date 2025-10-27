import { createRoomConfig, adjustConfigByRCL } from '../BaseRoomConfig';
import { ROLE_NAMES } from '../GlobalConstants';
import { CreepConfig } from '../../types/CreepConfig';
import { RoomState } from '../../types/RoomState';

/**
 * W1N1房间配置 - 迁移自原有CommonConstant配置
 * 保持与原有配置一致的行为
 */
const W1N1_CREEP_CONFIGS: CreepConfig[] = [
    {
        role: ROLE_NAMES.HARVESTER,
        body: [MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
        maxCount: 2,
        priority: 2,
        needLength: 2,
    },
    {
        role: ROLE_NAMES.CONTAINER_CARRY,
        body: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
        maxCount: 2,
        priority: 1,
        needLength: 2,
    },
    {
        role: ROLE_NAMES.STORAGE_CARRY,
        body: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
        maxCount: 1,
        priority: 4,
        needLength: 1,
    },
    {
        role: ROLE_NAMES.CARRY,
        body: [MOVE, CARRY, WORK],
        maxCount: 1,
        priority: 0,
        needLength: 1,
    },
    {
        role: ROLE_NAMES.UPGRADER,
        body: [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
        maxCount: 2,
        priority: 3,
        needLength: 1,
    },
    {
        role: ROLE_NAMES.BUILDER,
        body: [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
        maxCount: 0,
        priority: 5,
        needLength: 0,
    },
];

// 创建W1N1的基础配置
const w1n1Config = createRoomConfig('W1N1', {
    priority: 1, // 主要房间，高优先级

    // 覆盖creep生产配置以匹配原有行为
    creepProduction: {
        enabled: true,
        maxTotalCreeps: 20,
        productionPriority: 1,
        stateBasedConfigs: {
            [RoomState.NORMAL]: {
                creepConfigs: W1N1_CREEP_CONFIGS,
                productionStrategy: 'balanced',
            },
            [RoomState.DEVELOPING]: {
                creepConfigs: W1N1_CREEP_CONFIGS.map(config => {
                    if (config.role === ROLE_NAMES.BUILDER) {
                        return { ...config, maxCount: 2 }; // 发展状态增加建造者
                    }
                    return config;
                }),
                productionStrategy: 'aggressive',
            },
            [RoomState.LOW_ENERGY]: {
                creepConfigs: W1N1_CREEP_CONFIGS.filter(config =>
                    config.role === ROLE_NAMES.HARVESTER ||
                    config.role === ROLE_NAMES.CARRY ||
                    config.role === ROLE_NAMES.CONTAINER_CARRY
                ),
                productionStrategy: 'conservative',
            },
            [RoomState.UNDER_ATTACK]: {
                creepConfigs: W1N1_CREEP_CONFIGS.filter(config =>
                    config.role === ROLE_NAMES.HARVESTER ||
                    config.role === ROLE_NAMES.CARRY ||
                    config.role === ROLE_NAMES.CONTAINER_CARRY
                ),
                productionStrategy: 'conservative',
            },
            [RoomState.EMERGENCY]: {
                creepConfigs: W1N1_CREEP_CONFIGS.filter(config =>
                    config.role === ROLE_NAMES.HARVESTER
                ).map(config => ({ ...config, maxCount: 1 })),
                productionStrategy: 'conservative',
            },
        },
    },

    // 启用塔防，使用原配置的房间名
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

    // 资源配置 - 使用原有参数
    resourceConfig: {
        sourceAllocation: {
            enableDynamicAllocation: true,
            maxWorkersPerSource: 4,
            distanceFactor: 2.5,
        },
        containerManagement: {
            enableRoundRobin: true,
            maxTransferDistance: 10,
        },
        storageManagement: {
            enableStorageLogic: true,
            minEnergyForUpgrade: 100000,
        },
    },

    // 缓存配置 - 使用原有参数
    cacheConfig: {
        enableCache: true,
        cacheDuration: 100,
    },

    // 跨房间配置 - 主要房间，可以分享creep
    crossRoomConfig: {
        allowCreepSharing: true,
        sharingPriority: 1,
        maxSharedCreeps: 3,
    },
});

// 导出配置，根据RCL进行调整
export const W1N1_CONFIG = adjustConfigByRCL(w1n1Config, 5); // 假设为高级RCL房间
