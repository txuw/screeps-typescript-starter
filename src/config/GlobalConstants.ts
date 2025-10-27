// 全局通用配置 - 所有房间共享的基础设置

// 角色标识符
export const ROLE_NAMES = {
    HARVESTER: 'harvester',
    BUILDER: 'builder',
    UPGRADER: 'upgrader',
    CARRY: 'carry',
    CONTAINER_CARRY: 'containerCarry',
    STORAGE_CARRY: 'storageCarry',
} as const;

// 全局算法参数
export const GLOBAL_ALGORITHM_CONFIG = {
    // 距离计算因子
    DISTANCE_FACTOR: 1.5,
    BASE_WORKER_COUNT: 2,
    MIN_WORKER_COUNT: 1,
    MAX_WORKER_COUNT: 6,

    // 能量相关阈值
    CREEP_ENERGY_THRESHOLD: 0.8,     // creep能量工作阈值
    TRANSFER_ENERGY_THRESHOLD: 0.3,  // 传输能量阈值

    // 缓存设置
    DEFAULT_CACHE_DURATION: 10,
    GLOBAL_CACHE_ENABLED: true,

    // 建筑优先级
    STRUCTURE_PRIORITIES: {
        spawn: 0,
        extension: 1,
        tower: 2,
        storage: 3,
        container: 4,
        wall: 5,
        rampart: 6,
        road: 7,
        constructedWall: 8,
        controller: 9,
    } as const,

    // 等待位置管理
    WAITING_POSITION_CONFIG: {
        MAX_WAITING_TIME: 50,        // 最大等待时间
        RECHECK_INTERVAL: 5,         // 重新检查间隔
        DEFAULT_DISTANCE: 3,         // 默认等待距离
    },
} as const;

// 全局房间状态阈值
export const GLOBAL_ROOM_THRESHOLDS = {
    // 能量阈值 (百分比)
    LOW_ENERGY_DEFAULT: 30,
    EMERGENCY_ENERGY_DEFAULT: 10,

    // 建筑阈值
    MAX_CONSTRUCTION_SITES_DEFAULT: 0,
    DAMAGED_STRUCTURES_THRESHOLD_DEFAULT: 3,

    // RCL阶段划分
    EARLY_GAME_RCL: 3,
    MID_GAME_RCL: 6,

    // 状态检查间隔
    STATE_CHECK_INTERVAL_DEFAULT: 20,
} as const;
