import { CommonConstant } from "../common/CommonConstant";
import { CreepUtils } from "../utils/CreepUtils";
import { SourceUtils } from "../utils/SourceUtils";
import { GLOBAL_ALGORITHM_CONFIG } from "../config/GlobalConstants";

export class Miner {
  creep: Creep

  constructor(creep: Creep) {
    this.creep = creep;
  }

  harvest() {
    // 只采集出生房间的mineral
    const mineral = this.findRoomMineral();

    if (!mineral) {
      console.log(`No mineral found in room ${this.creep.room.name}`);
      return;
    }

    // 检查mineral是否有储量
    if (mineral.mineralAmount === 0) {
      console.log(`Mineral ${mineral.id} has no reserves`);
      return;
    }

    // 检查是否有EXTRACTOR
    const extractor = this.findExtractor(mineral);
    if (!extractor) {
      console.log(`No extractor found for mineral ${mineral.id}`);
      return;
    }

    if (this.creep.store.getUsedCapacity() < this.creep.store.getCapacity()) {
      // 前往采集mineral
      if (this.creep.pos.isNearTo(mineral)) {
        const result = this.creep.harvest(mineral);
        if (result !== OK && result !== ERR_NOT_ENOUGH_RESOURCES && result !== ERR_TIRED) {
          console.log(`Failed to harvest mineral: ${result}`);
        }
      } else {
        this.creep.moveTo(mineral, { visualizePathStyle: { stroke: '#ff00ff' } });
      }
    } else {
      // 满载时转移到Storage
      this.transferToStorage();
    }
  }

  /**
   * 查找房间的mineral
   */
  private findRoomMineral(): Mineral | null {
    const minerals = this.creep.room.find(FIND_MINERALS);
    return minerals.length > 0 ? minerals[0] : null;
  }

  /**
   * 查找mineral对应的EXTRACTOR
   */
  private findExtractor(mineral: Mineral): StructureExtractor | null {
    const extractors = this.creep.room.find(FIND_MY_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_EXTRACTOR
    });

    // 查找与mineral位置相同的extractor
    for (const extractor of extractors) {
      if (extractor.pos.isNearTo(mineral)) {
        return extractor as StructureExtractor;
      }
    }

    return null;
  }

  /**
   * 转移矿物到存储结构
   * 使用优先级系统：Storage > Container > Terminal
   */
  private transferToStorage() {
    // 获取当前携带的矿物类型
    const mineralType = this.getMineralType();
    if (!mineralType) {
      return; // 没有携带矿物
    }

    // 查找所有可以存储矿物的结构
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 只考虑有存储容量的结构
        if (!("store" in structure)) {
          return false;
        }

        const storeStructure = structure as any;

        // 检查是否可以存储矿物类型
        const capacity = storeStructure.store.getCapacity(mineralType);
        if (!capacity || capacity === 0) {
          return false;
        }

        // 检查是否还有空间
        const used = storeStructure.store.getUsedCapacity(mineralType);
        return used < capacity;
      }
    });

    if (targets.length > 0) {
      // 使用SourceUtils的优先级排序方法和配置中的优先级
      const sortedTargets = SourceUtils.sortByPriority(targets, GLOBAL_ALGORITHM_CONFIG.MINER_CONFIG.STRUCTURE_PRIORITY, this.creep.pos);

      // 转移矿物到最高优先级且最近的目标
      const target = sortedTargets[0] as any;
      if (this.creep.transfer(target, mineralType) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(target, { visualizePathStyle: { stroke: '#00ffff' } });
      }
    } else {
      console.log(`No available storage structure found for mineral ${mineralType} in room ${this.creep.room.name}`);
    }
  }

  /**
   * 获取当前携带的矿物类型
   */
  private getMineralType(): ResourceConstant | null {
    for (const resource in this.creep.store) {
      if (resource !== RESOURCE_ENERGY && this.creep.store[resource as ResourceConstant] > 0) {
        return resource as ResourceConstant;
      }
    }
    return null;
  }
}
