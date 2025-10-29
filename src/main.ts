import { ErrorMapper } from "utils/ErrorMapper";
import {Builder} from "./role/Builder";
import {Harvester} from "./role/Harvester";
import {Upgrader} from "./role/Upgrader";
import {Carry} from "./role/Carry";
import {ContainerCarry} from "./role/ContainerCarry";
import {StorageCarry} from "./role/StorageCarry";
import {LinkCarry} from "./role/LinkCarry";
import {Claimer} from "./role/Claimer";
import {Miner} from "./role/Miner";
import {CrossRoomBuilder} from "./role/CrossRoomBuilder";
import {CrossRoomUpgrader} from "./role/CrossRoomUpgrader";
import {CreepFactory} from "./factory/CreepFactory";
import {TowerManager} from "./manager/TowerManager";
import {LinkManager} from "./manager/LinkManager";
import {SourceUtils} from "./utils/SourceUtils";
import {GameCacheManager} from "./utils/GameCacheManager";
import { ConfigLoader } from "./config/ConfigLoader";
import { RoomManager } from "./manager/RoomManager";
import { ROLE_NAMES } from "./config/GlobalConstants";
import { MineralUtils } from "./utils/MineralUtils";
import { CrossRoomUtils } from "./utils/CrossRoomUtils";

declare global {
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// 全局变量
let configLoader: ConfigLoader;
let roomManagers: { [roomName: string]: RoomManager } = {};

/**
 * 智能生产决策函数
 * 根据房间状态和creep数量决定是否需要生产creep
 */
function shouldProduceCreeps(roomManager: RoomManager): boolean {
  const roomStatus = roomManager.getRoomStatus();
  const roomState = roomStatus.state;
  const rcl = roomStatus.rcl;

  // 基础检查：确保有最基本的creep
  const needsHarvester = roomManager.needsCreepProduction('harvester');

  // 检查房间是否有Link网络需要LinkCarry
  const needsLinkCarry = roomManager.hasWorkForLinkCarry() &&
                         roomManager.needsCreepProduction('linkCarry');

  // 检查是否需要探索者（仅在GCL达到6级且有占领目标时）
  const needsClaimer = Game.gcl.level >= 6 &&
                       roomManager.hasClaimTargets() &&
                       roomManager.needsCreepProduction('claimer');

  // 检查是否需要矿物采集者（仅在有EXTRACTOR和矿物储量时）
  const needsMiner = MineralUtils.shouldBuildMiner(roomManager.getRoom()) &&
                     roomManager.needsCreepProduction('miner');

  // 检查是否需要跨房间建造者
  const needsCrossRoomBuilder = shouldProduceCrossRoomBuilder(roomManager);

  // 检查是否需要跨房间升级者
  const needsCrossRoomUpgrader = shouldProduceCrossRoomUpgrader(roomManager);

  // 紧急状态：只生产采集者保证基本运转
  if (roomState === 'emergency') {
    return needsHarvester;
  }

  // 低能量状态：优先保证采集和运输，包括Link搬运
  if (roomState === 'low_energy') {
    return needsHarvester ||
           needsLinkCarry ||
           roomManager.needsCreepProduction('carry') ||
           roomManager.needsCreepProduction('containerCarry');
  }

  // 攻击状态：优先保证基本运转，暂停建造
  if (roomState === 'under_attack') {
    return needsHarvester ||
           needsLinkCarry ||
           roomManager.needsCreepProduction('upgrader') ||
           roomManager.needsCreepProduction('carry');
  }

  // 发展状态：需要所有类型的creep
  if (roomState === 'developing') {
    return needsHarvester ||
           needsLinkCarry ||
           roomManager.needsCreepProduction('builder') ||
           roomManager.needsCreepProduction('upgrader') ||
           roomManager.needsCreepProduction('carry') ||
           roomManager.needsCreepProduction('containerCarry') ||
           needsMiner ||
           needsCrossRoomBuilder ||
           needsCrossRoomUpgrader;
  }

  // 正常状态：根据RCL决定生产策略
  if (roomState === 'normal') {
    if (rcl <= 3) {
      // 早期RCL：重点采集和升级
      return needsHarvester ||
             needsLinkCarry ||
             roomManager.needsCreepProduction('upgrader') ||
             roomManager.needsCreepProduction('carry');
    } else if (rcl <= 6) {
      // 中期RCL：平衡发展
      return needsHarvester ||
             needsLinkCarry ||
             needsMiner ||
             needsClaimer ||
             roomManager.needsCreepProduction('builder') ||
             roomManager.needsCreepProduction('upgrader') ||
             roomManager.needsCreepProduction('carry') ||
             roomManager.needsCreepProduction('containerCarry') ||
             needsCrossRoomBuilder ||
             needsCrossRoomUpgrader;
    } else {
      // 高级RCL：全面发展，包括探索者和矿物采集者
      return needsHarvester ||
             needsLinkCarry ||
             roomManager.needsCreepProduction('builder') ||
             roomManager.needsCreepProduction('upgrader') ||
             roomManager.needsCreepProduction('carry') ||
             roomManager.needsCreepProduction('containerCarry') ||
             roomManager.needsCreepProduction('storageCarry') ||
             needsMiner ||
             needsClaimer ||
             needsCrossRoomBuilder ||
             needsCrossRoomUpgrader;
    }
  }

  // 默认：如果需要采集者就生产
  return needsHarvester;
}

/**
 * 判断是否需要生产跨房间建造者
 */
function shouldProduceCrossRoomBuilder(roomManager: RoomManager): boolean {
  const room = roomManager.getRoom();
  const config = roomManager.getConfig();
  // 检查跨房间功能是否启用
  if (!config.crossRoomConfig?.crossRoomEnabled) {
    return false;
  }

  // 检查是否有足够能量
  if (!CrossRoomUtils.hasEnoughEnergyForCrossRoom(room, 'builder')) {
    return false;
  }

  // 检查是否已达到最大数量
  const currentCrossRoomBuilders = Object.values(Game.creeps).filter(
    creep => creep.memory.role === ROLE_NAMES.CROSS_ROOM_BUILDER &&
             creep.memory.homeRoom === room.name
  ).length;

  const maxCrossRoomBuilders = config.crossRoomConfig.maxCrossRoomBuilders || 0;
  if (currentCrossRoomBuilders >= maxCrossRoomBuilders) {
    return false;
  }

  // 检查是否有建造目标
  const buildTargets = config.crossRoomConfig.buildTargets || [];
  const activeTargets = buildTargets.filter(target =>
    (target.status === 'pending' || target.status === 'in_progress') &&
    CrossRoomUtils.needsSpawn(target.roomName)
  );
  console.log(activeTargets);
  return activeTargets.length > 0;
}

/**
 * 判断是否需要生产跨房间升级者
 */
function shouldProduceCrossRoomUpgrader(roomManager: RoomManager): boolean {
  const room = roomManager.getRoom();
  const config = roomManager.getConfig();

  // 检查跨房间功能是否启用
  if (!config.crossRoomConfig?.crossRoomEnabled) {
    return false;
  }

  // 检查是否有足够能量
  if (!CrossRoomUtils.hasEnoughEnergyForCrossRoom(room, 'upgrader')) {
    return false;
  }

  // 检查是否已达到最大数量
  const currentCrossRoomUpgraders = Object.values(Game.creeps).filter(
    creep => creep.memory.role === ROLE_NAMES.CROSS_ROOM_UPGRADER &&
             creep.memory.homeRoom === room.name
  ).length;

  const maxCrossRoomUpgraders = config.crossRoomConfig.maxCrossRoomUpgraders || 0;
  if (currentCrossRoomUpgraders >= maxCrossRoomUpgraders) {
    return false;
  }

  // 检查是否有升级目标
  const upgradeTargets = config.crossRoomConfig.upgradeTargets || [];
  const activeTargets = upgradeTargets.filter(target =>
    target.active &&
    target.currentRCL < target.targetRCL &&
    CrossRoomUtils.needsUpgrade(target.roomName, target.targetRCL) &&
    (!target.stopWhenSpawnBuilt || CrossRoomUtils.needsSpawn(target.roomName))
  );

  return activeTargets.length > 0;
}

// 初始化函数
function initializeGame(): void {
  console.log('[Main] 初始化游戏配置...');

  // 初始化配置加载器
  configLoader = ConfigLoader.getInstance();
  configLoader.initialize();

  // 初始化全局房间管理器状态
  if (!Memory.globalRoomManager) {
    Memory.globalRoomManager = {
      initialized: true,
      enabledRooms: [],
      lastGlobalUpdate: Game.time,
    };
  }

  // 初始化探索者目标房间配置
  if (!Memory.targetRooms) {
    Memory.targetRooms = [];
  }

  console.log('[Main] 游戏初始化完成');
}

// 获取或创建房间管理器
function getRoomManager(roomName: string): RoomManager | null {
  if (!configLoader) {
    return null;
  }

  // 检查缓存
  if (roomManagers[roomName]) {
    return roomManagers[roomName];
  }

  // 获取房间对象
  const room = Game.rooms[roomName];
  if (!room) {
    return null;
  }

  // 获取房间配置
  const config = configLoader.getRoomConfig(roomName, room);
  if (!config.enabled) {
    return null;
  }

  // 创建房间管理器
  const roomManager = new RoomManager(room, config);
  roomManagers[roomName] = roomManager;

  // 更新全局状态
  if (Memory.globalRoomManager && !Memory.globalRoomManager.enabledRooms.includes(roomName)) {
    Memory.globalRoomManager.enabledRooms.push(roomName);
  }

  console.log(`[Main] 已创建房间管理器: ${roomName}`);
  return roomManager;
}

// 运行房间管理器
function runRoomManager(roomName: string): void {
  const roomManager = getRoomManager(roomName);
  if (!roomManager) {
    return;
  }

  // 更新房间状态
  roomManager.updateRoomStatus();

  // 同步探索者目标房间配置到内存
  roomManager.syncClaimTargetsToMemory();

  // 生产creep - 智能生产策略
  const creepFactory = CreepFactory.getInstance();
  const creepConfigs = roomManager.getCurrentCreepConfigs();

  // 智能生产决策：检查是否需要生产creep
  if (shouldProduceCreeps(roomManager)) {
    const productionResult = creepFactory.greedyProduction(creepConfigs);

    if (productionResult.success) {
      console.log(`[${roomName}] Successfully spawned ${productionResult.creepName} (${roomManager.getCurrentState()})`);
    } else if (!productionResult.error?.includes("All creep types") && !productionResult.error?.includes("busy")) {
      console.log(`[${roomName}] Production failed: ${productionResult.error}`);
    }
  }

  // 运行塔防
  const towerConfig = roomManager.getConfig().towerConfig;
  if (towerConfig.enabled) {
    const towerManager = TowerManager.getInstance();
    towerManager.manageRoomTowers(roomName);
  }

  // 运行Link网络
  const linkConfig = roomManager.getConfig().linkConfig;
  if (linkConfig.enabled) {
    const linkManager = LinkManager.getInstance();
    linkManager.manageRoomLinks(roomName);
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // 初始化游戏（首次运行）
  if (!configLoader) {
    initializeGame();
  }

  // 清理过期缓存
  GameCacheManager.cleanupExpiredCache();

  // 运行所有启用的房间管理器
  const enabledRooms = Memory.globalRoomManager?.enabledRooms || [];
  for (const roomName of enabledRooms) {
    runRoomManager(roomName);
  }

  // 自动发现新房间（如果有新的controller）
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    if (room.controller && room.controller.my && !enabledRooms.includes(roomName)) {
      console.log(`[Main] 发现新房间: ${roomName}`);
      getRoomManager(roomName);
    }
  }

  // 运行creep逻辑
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];

    // 确保creep有homeRoom
    if (!creep.memory.homeRoom) {
      creep.memory.homeRoom = creep.room.name;
    }

    switch (creep.memory.role) {
      case ROLE_NAMES.HARVESTER:
        const harvester = new Harvester(creep);
        harvester.harvest();
        break;
      case ROLE_NAMES.LINK_CARRY:
        const linkCarry = new LinkCarry(creep);
        linkCarry.transport();
        break;
      case ROLE_NAMES.CONTAINER_CARRY:
        const containerCarry = new ContainerCarry(creep);
        containerCarry.transport();
        break;
      case ROLE_NAMES.STORAGE_CARRY:
        const storageCarry = new StorageCarry(creep);
        storageCarry.transport();
        break;
      case ROLE_NAMES.CARRY:
        const carry = new Carry(creep);
        carry.transport();
        break;
      case ROLE_NAMES.UPGRADER:
        const upgrader = new Upgrader(creep);
        const sourcesForUpgrader = SourceUtils.getRoomSources(creep.room);
        upgrader.upgrade(sourcesForUpgrader);
        break;
      case ROLE_NAMES.BUILDER:
        const builder = new Builder(creep);
        const sourcesForBuilder = SourceUtils.getRoomSources(creep.room);
        builder.build(sourcesForBuilder);
        break;
      case ROLE_NAMES.CLAIMER:
        const claimer = new Claimer(creep);
        claimer.work();
        break;
      case ROLE_NAMES.MINER:
        const miner = new Miner(creep);
        miner.harvest();
        break;
      case ROLE_NAMES.CROSS_ROOM_BUILDER:
        const crossRoomBuilder = new CrossRoomBuilder(creep);
        crossRoomBuilder.build();
        break;
      case ROLE_NAMES.CROSS_ROOM_UPGRADER:
        const crossRoomUpgrader = new CrossRoomUpgrader(creep);
        crossRoomUpgrader.upgrade();
        break;
    }
  }

  // 清理过期内存
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // 清理不存在的房间管理器
  for (const roomName in roomManagers) {
    if (!Game.rooms[roomName]) {
      delete roomManagers[roomName];
      if (Memory.globalRoomManager) {
        const index = Memory.globalRoomManager.enabledRooms.indexOf(roomName);
        if (index > -1) {
          Memory.globalRoomManager.enabledRooms.splice(index, 1);
        }
      }
      console.log(`[Main] 移除不存在的房间管理器: ${roomName}`);
    }
  }

  if (Memory.globalRoomManager) {
    Memory.globalRoomManager.lastGlobalUpdate = Game.time;
  }
});

