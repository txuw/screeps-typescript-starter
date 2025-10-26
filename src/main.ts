import { ErrorMapper } from "utils/ErrorMapper";
import {CommonConstant} from "./common/CommonConstant";
import {Builder} from "./role/Builder";
import {Harvester} from "./role/Harvester";
import {Upgrader} from "./role/Upgrader";
import {Carry} from "./role/Carry";
import {ContainerCarry} from "./role/ContainerCarry";
import {StorageCarry} from "./role/StorageCarry";
import {CreepFactory} from "./factory/CreepFactory";
import {TowerManager} from "./manager/TowerManager";
import {SourceUtils} from "./utils/SourceUtils";
import {GameCacheManager} from "./utils/GameCacheManager";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    upgrading: boolean;
    building: boolean;
    targetSourceId?: string;
    targetContainerId?: string;
  }

  interface RoomMemory {
    containerRoundRobinIndex?: number;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  // 清理过期缓存
  GameCacheManager.cleanupExpiredCache();

  // 使用工厂方法进行creep生产
  const creepFactory = CreepFactory.getInstance();
  // 使用贪心生产策略
  const productionResult = creepFactory.greedyProduction(CommonConstant.CREEP_CONFIGS);
  if (productionResult.success) {
    console.log(`Successfully spawned ${productionResult.creepName}`);
  } else if (!productionResult.error?.includes("All creep types") && !productionResult.error?.includes("busy")) {
    console.log(`Production failed: ${productionResult.error}`);
  }
  Game.structures
  for(var name in Game.creeps) {
    const creep = Game.creeps[name];
    switch (creep.memory.role){
      case CommonConstant.HARVESTER:
        const harvester = new Harvester(creep);
        // Harvester现在可以动态获取sources，不再需要传入参数
        harvester.harvest();
        break;
      case CommonConstant.CONTAINER_CARRY:
        const containerCarry = new ContainerCarry(creep);
        // ContainerCarry负责Container到Storage的物流
        containerCarry.transport();
        break;
      case CommonConstant.STORAGE_CARRY:
        const storageCarry = new StorageCarry(creep);
        // StorageCarry负责Storage到各个建筑的能量分配
        storageCarry.transport();
        break;
      case CommonConstant.CARRY:
        const carry = new Carry(creep);
        // 保留原有Carry逻辑作为备用
        carry.transport();
        break;
      case CommonConstant.UPGRADER:
        const upgrader = new Upgrader(creep);
        // 获取当前房间的sources用于upgrader
        const sourcesForUpgrader = SourceUtils.getRoomSources(creep.room);
        upgrader.upgrade(sourcesForUpgrader);
        break;
      case CommonConstant.BUILDER:
        const builder = new Builder(creep);
        // 获取当前房间的sources用于builder
        const sourcesForBuilder = SourceUtils.getRoomSources(creep.room);
        builder.build(sourcesForBuilder);
        break;
    }
  }

  // 塔管理逻辑
  if (CommonConstant.TOWER_ENABLED) {
    const towerManager = TowerManager.getInstance();
    towerManager.manageRoomTowers(CommonConstant.TOWER_ROOM_NAME);
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});

