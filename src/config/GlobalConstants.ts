// 全局通用配置 - 所有房间共享的基础设置

// 角色标识符
export const ROLE_NAMES = {
    HARVESTER: 'harvester',
    BUILDER: 'builder',
    UPGRADER: 'upgrader',
    CARRY: 'carry',
    CONTAINER_CARRY: 'containerCarry',
    STORAGE_CARRY: 'storageCarry',
    LINK_CARRY: 'linkCarry',
    CLAIMER: 'claimer',
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
        link: 5,
        wall: 6,
        rampart: 7,
        road: 8,
        constructedWall: 9,
        controller: 10,
    } as const,

    // 等待位置管理
    WAITING_POSITION_CONFIG: {
        MAX_WAITING_TIME: 50,        // 最大等待时间
        RECHECK_INTERVAL: 5,         // 重新检查间隔
        DEFAULT_DISTANCE: 3,         // 默认等待距离
    },

    // Link相关配置
    LINK_CONFIG: {
        CAPACITY: 800,               // Link容量
        TRANSFER_COST: 0.03,         // 传输能量消耗比例 (3%)
        COOLDOWN: 1,                 // 传输冷却时间
        TRANSFER_RANGE: 2,           // 传输范围
        MIN_ENERGY_TO_TRANSFER: 100, // 最小传输能量
        STORAGE_LINK_THRESHOLD: 0.7, // Storage Link传输阈值
        SOURCE_LINK_THRESHOLD: 0.5,  // Source Link传输阈值
    },

    // 探索者相关配置
    CLAIMER_CONFIG: {
        CLAIM_PARTS: 2,              // CLAIM部件数量
        MOVE_PARTS: 10,              // MOVE部件数量
        LIFETIME_TICKS: 600,         // CLAIM creep寿命
        CLAIM_RANGE: 1,              // claimController范围
        RESERVATION_TICKS_PER_PART: 1, // 每个CLAIM部件每tick增加的预定时间
        DECCELERATION_TICKS_PER_PART: 300, // 每个CLAIM部件每tick加速的降级时间
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
    STATE_CHECK_INTERVAL_DEFAULT: 10,
} as const;
