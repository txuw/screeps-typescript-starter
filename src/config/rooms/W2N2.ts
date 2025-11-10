import { createRoomConfig, adjustConfigByRCL } from '../BaseRoomConfig';
import { ROLE_NAMES, GLOBAL_ALGORITHM_CONFIG } from '../GlobalConstants';
import { CreepConfig } from '../../types/CreepConfig';
import { RoomState } from '../../types/RoomState';
import { MineralUtils } from '../../utils/MineralUtils';
import { TerminalCarry } from "../../role/TerminalCarry";

/**
 * W1N1房间配置 - 迁移自原有CommonConstant配置
 * 保持与原有配置一致的行为
 */
const W2N2_CREEP_CONFIGS: CreepConfig[] = [
  {
    role: ROLE_NAMES.HARVESTER,
    body: [MOVE,CARRY,CARRY,CARRY,CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
    maxCount: 2,
    priority: 1,
    needLength: 2,
  },
  {
    role: ROLE_NAMES.LINK_CARRY,
    body: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
    maxCount: 1,
    priority: 0, // 最高优先级，确保Link能量及时搬运
    needLength: 1,
  },
  {
    role: ROLE_NAMES.CONTAINER_CARRY,
    body: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
    maxCount: 0,
    priority: 2,
    needLength: 0,
  },
  {
    role: ROLE_NAMES.STORAGE_CARRY,
    body: [MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY],
    maxCount: 0,
    priority: 6, // 调整优先级，在Miner之后
    needLength: 0,
  },
  {
    role: ROLE_NAMES.CARRY,
    body: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
    maxCount: 2,
    priority: 0, // 调整优先级，作为基础容错搬运
    needLength: 1,
  },
  {
    role: ROLE_NAMES.UPGRADER,
    body: [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,  WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
    maxCount: 1,
    priority: 4,
    needLength: 1,
  },
  {
    role: ROLE_NAMES.BUILDER,
    body: [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK, WORK, WORK, WORK],
    maxCount: 0,
    priority: 7, // 调整优先级，在Miner和StorageCarry之后
    needLength: 0,
  },
  {
    role: ROLE_NAMES.CLAIMER,
    body: [], // 将由ClaimerUtils.generateClaimerBody动态生成
    maxCount: 0,
    priority: 4, // 中等优先级
    needLength: 0,
  },
  {
    role: ROLE_NAMES.MINER,
    body: MineralUtils.generateMinerBody(),
    maxCount: 1,
    priority: 5, // Upgrader之后，StorageCarry之前
    needLength: 1,
    storagePriority: GLOBAL_ALGORITHM_CONFIG.MINER_CONFIG.STORAGE_PRIORITY,
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
  // Terminal搬运者
  {
    role: ROLE_NAMES.TERMINAL_CARRY,
    body: TerminalCarry.generateTerminalCarryBody(),
    maxCount: 1,
    priority: 5, // 中等优先级，在基础creep之后
    needLength: 1,
  },
];

// 创建W1N1的基础配置
const w2n21Config = createRoomConfig('W2N2', {
  priority: 1, // 主要房间，高优先级

  // 覆盖creep生产配置以匹配原有行为
  creepProduction: {
    enabled: true,
    maxTotalCreeps: 20,
    productionPriority: 1,
    stateBasedConfigs: {
      [RoomState.NORMAL]: {
        creepConfigs: W2N2_CREEP_CONFIGS.map(config=>{
          return config;
        }),
        productionStrategy: 'balanced',
      },
      [RoomState.DEVELOPING]: {

        creepConfigs: W2N2_CREEP_CONFIGS.map(config => {
          if (config.role === ROLE_NAMES.BUILDER) {
            return { ...config, maxCount: 2 }; // 发展状态增加建造者
          }
          if (config.role === ROLE_NAMES.UPGRADER) {
            return { ...config, maxCount: 1 }; // 发展状态增加建造者
          }
          return config;
        }),
        productionStrategy: 'aggressive',
      },
      [RoomState.LOW_ENERGY]: {
        creepConfigs: W2N2_CREEP_CONFIGS.filter(config =>
          config.role === ROLE_NAMES.HARVESTER ||
          config.role === ROLE_NAMES.CARRY ||
          config.role === ROLE_NAMES.CONTAINER_CARRY
        ),
        productionStrategy: 'conservative',
      },
      [RoomState.UNDER_ATTACK]: {
        creepConfigs: W2N2_CREEP_CONFIGS.filter(config =>
          config.role === ROLE_NAMES.HARVESTER ||
          config.role === ROLE_NAMES.CARRY ||
          config.role === ROLE_NAMES.CONTAINER_CARRY
        ),
        productionStrategy: 'conservative',
      },
      [RoomState.EMERGENCY]: {
        creepConfigs: W2N2_CREEP_CONFIGS.filter(config =>
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
    linkManagement: {
      enabled: true,
      transferInterval: 3,
      sourceTransferThreshold: 0.5,
      storageTransferThreshold: 0.7,
      minEnergyToTransfer: 100,
    },
  },

  // Link网络配置
  linkConfig: {
    enabled: true,
    transferInterval: 3,
    sourceTransferThreshold: 0.5,
    storageTransferThreshold: 0.7,
    minEnergyToTransfer: 100,
  },

  // 缓存配置 - 使用原有参数
  cacheConfig: {
    enableCache: true,
    cacheDuration: 100,
  },

  // 跨房间配置 - 主要房间，可以分享creep和进行扩张
  crossRoomConfig: {
    allowCreepSharing: false,
    sharingPriority: 1,
    maxSharedCreeps: 3,
    claimTargets: [
    ],
    enableClaiming: false,

    // 跨房间建造配置
    buildTargets: [

    ], // 将在具体房间配置中设置建造目标
    upgradeTargets: [

    ], // 将在具体房间配置中设置升级目标

    // 跨房间creep配置
    maxCrossRoomBuilders: 1,
    maxCrossRoomUpgraders: 1,
    crossRoomEnabled: false,
    minEnergyForCrossRoom: 1000,

  },

  // Terminal配置
  terminalConfig: {
    enabled: true,
    terminalConfigs: [
      {
        resourceType: RESOURCE_HYDROGEN,
        amount: "10000",
        targetRoom: "W1N1",
        desc: "向W1N1发送H矿",
        count: "2"
      }
    ]
  },
});

// 导出配置，根据RCL进行调整
export const W2N2_CONFIG = adjustConfigByRCL(w2n21Config, 2); // 假设为高级RCL房间
