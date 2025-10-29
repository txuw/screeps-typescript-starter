import { RoomState, RoomDevelopmentStage } from './RoomState';
import { CreepConfig } from './CreepConfig';

export interface RoomCreepProduction {
    enabled: boolean;
    maxTotalCreeps: number;
    productionPriority: number;
    // 根据房间状态动态调整的creep配置
    stateBasedConfigs: {
        [key in RoomState]?: {
            creepConfigs: CreepConfig[];
            productionStrategy: 'aggressive' | 'conservative' | 'balanced';
        };
    };
}

export interface RoomTowerConfig {
    enabled: boolean;
    repairThreshold: number;          // 修复阈值 (百分比)
    defenseMode: {
        enabled: boolean;
        minHitsToAttack: number;      // 最小血量攻击阈值
        allyWhitelist: string[];      // 盟友白名单
    };
    repairPriorities: string[];       // 修复优先级
}

export interface RoomResourceConfig {
    sourceAllocation: {
        enableDynamicAllocation: boolean;
        maxWorkersPerSource: number;
        distanceFactor: number;
    };
    containerManagement: {
        enableRoundRobin: boolean;
        maxTransferDistance: number;
    };
    storageManagement: {
        enableStorageLogic: boolean;
        minEnergyForUpgrade: number;
    };
    linkManagement: {
        enabled: boolean;
        transferInterval: number;
        sourceTransferThreshold: number;
        storageTransferThreshold: number;
        minEnergyToTransfer: number;
    };
}

export interface RoomConfig {
    // 基本信息
    roomName: string;
    enabled: boolean;
    priority: number;                 // 房间优先级

    // 房间状态配置
    stateConfig: {
        autoAdapt: boolean;           // 是否自动适应状态
        stateCheckInterval: number;   // 状态检查间隔 (tick)
        thresholds: {
            lowEnergyThreshold: number;
            emergencyEnergyThreshold: number;
            maxConstructionSites: number;
            damagedStructuresThreshold: number;
        };
    };

    // Creep生产配置
    creepProduction: RoomCreepProduction;

    // 塔防配置
    towerConfig: RoomTowerConfig;

    // 资源管理配置
    resourceConfig: RoomResourceConfig;

    // Link网络配置
    linkConfig: {
        enabled: boolean;
        transferInterval: number;
        sourceTransferThreshold: number;
        storageTransferThreshold: number;
        minEnergyToTransfer: number;
    };

    // 缓存配置
    cacheConfig: {
        enableCache: boolean;
        cacheDuration: number;
    };

    // 跨房间配置
    crossRoomConfig: {
        allowCreepSharing: boolean;
        sharingPriority: number;
        maxSharedCreeps: number;
        claimTargets?: Array<{
            roomName: string;
            x: number;
            y: number;
            priority?: number;
            claimed?: boolean;
        }>;
        enableClaiming?: boolean;

        // 跨房间建造配置
        buildTargets?: Array<{
            roomName: string;
            priority: number;
            requiredStructures: StructureConstant[];
            status: 'pending' | 'in_progress' | 'completed';
            assignedCreeps?: string[];
        }>;

        // 跨房间升级配置
        upgradeTargets?: Array<{
            roomName: string;
            priority: number;
            targetRCL: number;
            currentRCL: number;
            active: boolean;
            assignedCreeps?: string[];
            stopWhenSpawnBuilt: boolean;
        }>;

        // 跨房间creep配置
        maxCrossRoomBuilders?: number;
        maxCrossRoomUpgraders?: number;
        crossRoomEnabled?: boolean;
        minEnergyForCrossRoom?: number;
    };

    // 特殊配置
    specialConfig: {
        enableEmergencyMode: boolean;
        enableRebuildingMode: boolean;
        customStrategies: string[];
    };
}