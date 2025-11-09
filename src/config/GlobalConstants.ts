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
    TERMINAL_CARRY: 'terminalCarry',
    CLAIMER: 'claimer',
    MINER: 'miner',
    CROSS_ROOM_BUILDER: 'crossRoomBuilder',
    CROSS_ROOM_UPGRADER: 'crossRoomUpgrader',
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
        MIN_ENERGY_TO_TRANSFER: 0, // 最小传输能量
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

    // 矿物采集者相关配置
    MINER_CONFIG: {
        MOVE_PARTS: 6,               // MOVE部件数量
        CARRY_PARTS: 6,              // CARRY部件数量
        WORK_PARTS: 8,               // WORK部件数量
        MINERAL_THRESHOLD: 1,     // 开始采集的最小矿物储量
        STORAGE_PRIORITY: 10,        // Storage存储优先级
        COOLDOWN_TICKS: 5,           // 采集冷却时间
        // 矿物存储结构优先级，数字越小优先级越高
        STRUCTURE_PRIORITY: {
            [STRUCTURE_STORAGE]: 0,      // Storage优先级最高
            [STRUCTURE_CONTAINER]: 1,    // Container次之
            [STRUCTURE_TERMINAL]: 2,     // Terminal可选
        },
    },

    // 跨房间相关配置
    CROSS_ROOM_CONFIG: {
        // 跨房间Builder配置
        BUILDER_BODY: {
            MOVE: 12,                 // MOVE部件数量 - 高移动性
            CARRY: 6,                 // CARRY部件数量 - 足够的容量
            WORK: 6,                  // WORK部件数量 - 高效建造
        },
        // 跨房间Upgrader配置
        UPGRADER_BODY: {
            MOVE: 10,                 // MOVE部件数量
            CARRY: 8,                 // CARRY部件数量 - 更多容量携带能量
            WORK: 6,                  // WORK部件数量 - 高效升级
        },
        // 跨房间相关参数
        MAX_TRAVEL_TIME: 300,        // 最大旅行时间
        MIN_ENERGY_FOR_CROSS_ROOM: 1000, // 跨房间任务最小能量要求
        BUILDER_SPAWN_PRIORITY: 1,   // Builder建造优先级 (Spawn最高)
        UPGRADER_MIN_RCL: 1,         // Upgrader最低目标RCL
        // 建造优先级 - Spawn最重要
        BUILD_PRIORITIES: {
            [STRUCTURE_SPAWN]: 0,       // Spawn最高优先级
            [STRUCTURE_EXTENSION]: 1,   // Extension次之
            [STRUCTURE_CONTAINER]: 2,   // Container
            [STRUCTURE_ROAD]: 3,        // Road
            [STRUCTURE_TOWER]: 4,       // Tower
            [STRUCTURE_STORAGE]: 5,     // Storage
            [STRUCTURE_LINK]: 6,        // Link
            [STRUCTURE_WALL]: 7,        // Wall
            [STRUCTURE_RAMPART]: 8,     // Rampart
            [STRUCTURE_OBSERVER]: 9,    // Observer
            [STRUCTURE_POWER_SPAWN]: 10, // Power Spawn
            [STRUCTURE_EXTRACTOR]: 11,  // Extractor
            [STRUCTURE_LAB]: 12,        // Lab
            [STRUCTURE_TERMINAL]: 13,   // Terminal
            [STRUCTURE_NUKER]: 14,      // Nuker
            [STRUCTURE_FACTORY]: 15,    // Factory
            [STRUCTURE_POWER_BANK]: 16, // Power Bank
        } as const,
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
