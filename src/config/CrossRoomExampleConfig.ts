import { createRoomConfig } from './BaseRoomConfig';
import { ROLE_NAMES } from './GlobalConstants';

/**
 * 跨房间功能示例配置
 * 展示如何配置跨房间建造者和升级者
 */

// 主房间配置（有充足资源的房间）
export const MAIN_ROOM_CONFIG = createRoomConfig('E1N1', {
    priority: 10, // 高优先级

    // 启用跨房间功能
    crossRoomConfig: {
        allowCreepSharing: true,
        sharingPriority: 5,
        maxSharedCreeps: 2,
        claimTargets: [
            {
                roomName: 'E2N1',
                x: 25,
                y: 25,
                priority: 1,
                claimed: false
            }
        ],
        enableClaiming: true,

        // 跨房间建造配置
        buildTargets: [
            {
                roomName: 'E2N1',
                priority: 1,
                requiredStructures: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
                status: 'pending',
                assignedCreeps: []
            }
        ],

        // 跨房间升级配置
        upgradeTargets: [
            {
                roomName: 'E2N1',
                priority: 1,
                targetRCL: 4,
                currentRCL: 1,
                active: true,
                assignedCreeps: [],
                stopWhenSpawnBuilt: true // 当Spawn建成时停止升级
            }
        ],

        // 跨房间creep配置
        maxCrossRoomBuilders: 2, // 最多2个跨房间建造者
        maxCrossRoomUpgraders: 1, // 最多1个跨房间升级者
        crossRoomEnabled: true, // 启用跨房间功能
        minEnergyForCrossRoom: 1000, // 跨房间任务最小能量要求
    },

    // 调整creep生产配置，增加跨房间角色
    creepProduction: {
        enabled: true,
        maxTotalCreeps: 30, // 增加总数限制
        productionPriority: 1,
        stateBasedConfigs: {
            normal: {
                creepConfigs: [
                    // 基础角色配置...
                    {
                        role: ROLE_NAMES.HARVESTER,
                        body: [WORK, CARRY, MOVE],
                        maxCount: 4,
                        priority: 10,
                        needLength: 4,
                    },
                    {
                        role: ROLE_NAMES.BUILDER,
                        body: [WORK, CARRY, MOVE],
                        maxCount: 6,
                        priority: 8,
                        needLength: 6,
                    },
                    {
                        role: ROLE_NAMES.UPGRADER,
                        body: [WORK, CARRY, MOVE],
                        maxCount: 4,
                        priority: 9,
                        needLength: 4,
                    },
                    {
                        role: ROLE_NAMES.CARRY,
                        body: [CARRY, CARRY, MOVE, MOVE],
                        maxCount: 4,
                        priority: 7,
                        needLength: 4,
                    },

                    // 跨房间角色配置
                    {
                        role: ROLE_NAMES.CROSS_ROOM_BUILDER,
                        body: [], // 将由CrossRoomUtils动态生成
                        maxCount: 2, // 对应crossRoomConfig.maxCrossRoomBuilders
                        priority: 3, // 较高优先级
                        needLength: 1,
                    },
                    {
                        role: ROLE_NAMES.CROSS_ROOM_UPGRADER,
                        body: [], // 将由CrossRoomUtils动态生成
                        maxCount: 1, // 对应crossRoomConfig.maxCrossRoomUpgraders
                        priority: 2, // 较高优先级
                        needLength: 1,
                    },
                    {
                        role: ROLE_NAMES.CLAIMER,
                        body: [], // 将由ClaimerUtils动态生成
                        maxCount: 1,
                        priority: 4,
                        needLength: 1,
                    }
                ],
                productionStrategy: 'balanced'
            }
        }
    }
});

/**
 * 高级主房间配置（RCL 8+，支持多个跨房间目标）
 */
export const ADVANCED_MAIN_ROOM_CONFIG = createRoomConfig('W1N1', {
    priority: 15,

    crossRoomConfig: {
        allowCreepSharing: true,
        sharingPriority: 5,
        maxSharedCreeps: 4,

        // 多个占领目标
        claimTargets: [
            {
                roomName: 'W2N1',
                x: 25,
                y: 25,
                priority: 1,
                claimed: false
            },
            {
                roomName: 'W1N2',
                x: 25,
                y: 25,
                priority: 2,
                claimed: false
            }
        ],
        enableClaiming: true,

        // 多个建造目标
        buildTargets: [
            {
                roomName: 'W2N1',
                priority: 1,
                requiredStructures: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER],
                status: 'pending',
                assignedCreeps: []
            },
            {
                roomName: 'W1N2',
                priority: 2,
                requiredStructures: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
                status: 'pending',
                assignedCreeps: []
            }
        ],

        // 多个升级目标
        upgradeTargets: [
            {
                roomName: 'W2N1',
                priority: 1,
                targetRCL: 6,
                currentRCL: 1,
                active: true,
                assignedCreeps: [],
                stopWhenSpawnBuilt: false // 持续升级直到目标RCL
            },
            {
                roomName: 'W1N2',
                priority: 2,
                targetRCL: 4,
                currentRCL: 1,
                active: true,
                assignedCreeps: [],
                stopWhenSpawnBuilt: true
            }
        ],

        // 更多的跨房间creep
        maxCrossRoomBuilders: 4,
        maxCrossRoomUpgraders: 2,
        crossRoomEnabled: true,
        minEnergyForCrossRoom: 1500, // 更高的能量要求
    },

    creepProduction: {
        enabled: true,
        maxTotalCreeps: 50, // 更多creep容量
        productionPriority: 1,
        stateBasedConfigs: {
            normal: {
                creepConfigs: [
                    // 包含所有角色的完整配置
                    {
                        role: ROLE_NAMES.HARVESTER,
                        body: [WORK, CARRY, MOVE],
                        maxCount: 6,
                        priority: 10,
                        needLength: 4,
                    },
                    {
                        role: ROLE_NAMES.BUILDER,
                        body: [WORK, CARRY, MOVE],
                        maxCount: 8,
                        priority: 8,
                        needLength: 6,
                    },
                    {
                        role: ROLE_NAMES.UPGRADER,
                        body: [WORK, CARRY, MOVE],
                        maxCount: 6,
                        priority: 9,
                        needLength: 4,
                    },
                    {
                        role: ROLE_NAMES.CARRY,
                        body: [CARRY, CARRY, MOVE, MOVE],
                        maxCount: 6,
                        priority: 7,
                        needLength: 4,
                    },
                    {
                        role: ROLE_NAMES.LINK_CARRY,
                        body: [CARRY, CARRY, MOVE, MOVE],
                        maxCount: 2,
                        priority: 1,
                        needLength: 2,
                    },
                    {
                        role: ROLE_NAMES.STORAGE_CARRY,
                        body: [CARRY, CARRY, MOVE, MOVE],
                        maxCount: 2,
                        priority: 5,
                        needLength: 2,
                    },

                    // 跨房间角色
                    {
                        role: ROLE_NAMES.CROSS_ROOM_BUILDER,
                        body: [],
                        maxCount: 4,
                        priority: 3,
                        needLength: 1,
                    },
                    {
                        role: ROLE_NAMES.CROSS_ROOM_UPGRADER,
                        body: [],
                        maxCount: 2,
                        priority: 2,
                        needLength: 1,
                    },
                    {
                        role: ROLE_NAMES.CLAIMER,
                        body: [],
                        maxCount: 2,
                        priority: 4,
                        needLength: 1,
                    },
                    {
                        role: ROLE_NAMES.MINER,
                        body: [],
                        maxCount: 1,
                        priority: 6,
                        needLength: 1,
                    }
                ],
                productionStrategy: 'balanced'
            }
        }
    }
});

/**
 * 使用说明：
 *
 * 1. 基础设置：
 *    - 在房间配置中设置 crossRoomConfig.crossRoomEnabled = true
 *    - 配置 buildTargets 和 upgradeTargets 数组
 *    - 设置 maxCrossRoomBuilders 和 maxCrossRoomUpgraders
 *
 * 2. 建造目标 (buildTargets)：
 *    - roomName: 目标房间名称
 *    - priority: 优先级（数字越小优先级越高）
 *    - requiredStructures: 需要建造的结构类型
 *    - status: 任务状态 ('pending' | 'in_progress' | 'completed')
 *
 * 3. 升级目标 (upgradeTargets)：
 *    - roomName: 目标房间名称
 *    - priority: 优先级
 *    - targetRCL: 目标RCL等级
 *    - currentRCL: 当前RCL等级（会自动更新）
 *    - stopWhenSpawnBuilt: 是否在Spawn建成后停止升级
 *
 * 4. 动态配置：
 *    - 系统会自动检查目标房间的实际状态
 *    - 只有当目标房间真正需要建造或升级时才会生产creep
 *    - 任务完成后会自动更新状态
 *
 * 5. 能量管理：
 *    - minEnergyForCrossRoom 设置跨房间任务的最小能量要求
 *    - 跨房间creep会自动在主房间补充能量后再前往目标
 *
 * 6. 优先级策略：
 *    - 跨房间角色的优先级设置较高（2-3）
 *    - 确保关键的基础设施能够快速建立
 *    - 建造优先级高于升级优先级
 */