import { RoomConfig } from './RoomConfig';
import { RoomStatusInfo } from './RoomState';

// 扩展Memory接口
declare global {
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    // 全局房间管理器状态
    globalRoomManager?: {
      initialized: boolean;
      enabledRooms: string[];
      lastGlobalUpdate: number;
    };
    // 探索者目标房间配置
    targetRooms?: Array<{
      roomName: string;
      x: number;
      y: number;
      priority?: number;
      claimed?: boolean;
      claimedAt?: number;
      claimedBy?: string;
    }>;
  }

  // 扩展CreepMemory接口
  interface CreepMemory {
    role: string;
    room: string;
    homeRoom: string;              // 出生房间，用于跨房间管理
    working: boolean;
    upgrading: boolean;
    building: boolean;
    targetSourceId?: string;
    targetContainerId?: string;
    // 新增字段
    currentRoom?: string;          // 当前所在房间
    lastRoom?: string;             // 上次所在房间
    crossRoomTask?: boolean;       // 是否为跨房间任务
    taskTargetRoom?: string;       // 任务目标房间
    energyState?: 'harvesting' | 'working' | 'waiting'; // 能量状态
    stuckCounter?: number;         // 卡住计数器
    lastPosition?: { x: number; y: number; roomName: string }; // 上次位置
  }

  // 扩展RoomMemory接口
  interface RoomMemory {
    // 原有字段
    containerRoundRobinIndex?: number;

    // 新增配置相关字段
    config?: RoomConfig;
    configVersion?: number;

    // 房间状态信息
    roomStatus?: RoomStatusInfo;
    lastStateUpdate?: number;

    // 房间管理相关
    enabled?: boolean;
    priority?: number;
    lastManaged?: number;

    // 资源分配相关
    sourceAssignment?: {
      [sourceId: string]: string[]; // sourceId -> creepNames[]
    };
    containerAssignment?: {
      [containerId: string]: string[]; // containerId -> creepNames[]
    };

    // 生产相关
    creepProductionHistory?: {
      [role: string]: number; // 角色生产历史
    };
    lastProductionTick?: number;

    // 跨房间相关
    crossRoomRequests?: {
      [requestType: string]: {
        requestingRoom: string;
        priority: number;
        requestedAt: number;
      }[];
    };
    sharedCreeps?: {
      [creepName: string]: {
        fromRoom: string;
        taskType: string;
        assignedAt: number;
      };
    };

    // 防御相关
    lastAttackTime?: number;
    enemyHistory?: {
      [playerName: string]: {
        lastSeen: number;
        hostility: 'neutral' | 'hostile' | 'ally';
      };
    };

    // 经济相关
    energyHistory?: {
      [tick: number]: {
        available: number;
        stored: number;
        capacity: number;
      };
    };
    lastEnergySnapshot?: number;
  }

  // Syntax for adding properties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
      // 全局RoomManager实例
      roomManagers?: {
        [roomName: string]: any; // RoomManager实例
      };
      // 全局配置缓存
      globalConfigs?: {
        [roomName: string]: RoomConfig;
      };
    }
  }
}

export {}; // 确保文件被作为模块处理