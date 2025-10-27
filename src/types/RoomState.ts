export enum RoomState {
    // 正常状态
    NORMAL = 'normal',

    // 发展状态
    DEVELOPING = 'developing',        // 建筑不完整
    LOW_ENERGY = 'low_energy',        // 能量不足
    UNDER_ATTACK = 'under_attack',    // 遭受攻击

    // 特殊状态
    EMERGENCY = 'emergency',          // 紧急状态
    REBUILDING = 'rebuilding',        // 重建状态
    FORTIFIED = 'fortified',          // 防御状态
}

export enum RoomDevelopmentStage {
    EARLY = 'early',                  // 早期 (RCL 1-3)
    MID = 'mid',                      // 中期 (RCL 4-6)
    LATE = 'late',                    // 后期 (RCL 7-8)
}

export interface RoomStatusInfo {
    state: RoomState;
    developmentStage: RoomDevelopmentStage;
    rcl: number;
    energyStored: number;
    energyCapacity: number;
    hasEnemy: boolean;
    constructionSites: number;
    structuresDamaged: number;
    lastUpdated: number;
}

export interface RoomStateThresholds {
    // 能量阈值
    lowEnergyThreshold: number;       // 低能量阈值 (百分比)
    emergencyEnergyThreshold: number; // 紧急能量阈值

    // 建筑阈值
    maxConstructionSites: number;     // 最大建筑工地数
    damagedStructuresThreshold: number; // 损坏建筑阈值

    // RCL相关
    earlyGameRCL: number;            // 早期游戏RCL上限
    midGameRCL: number;              // 中期游戏RCL上限
}