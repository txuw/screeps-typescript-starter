import { CreepUtils } from "../utils/CreepUtils";

export class Upgrader {
  creep: Creep

  // 存储结构优先级映射表（用于获取资源），数字越小优先级越高
  storagePriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 1,
    [STRUCTURE_STORAGE]: 0
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  upgrade(sources: Array<Source>) {
    if (this.creep.memory.upgrading && this.creep.store.energy === 0) {
      this.creep.memory.upgrading = false;
      this.creep.say('🔄 harvest');
    }
    if (!this.creep.memory.upgrading && this.creep.store.energy === this.creep.store.getCapacity()) {
      this.creep.memory.upgrading = true;
      this.creep.say('⚡ upgrade');
    }

    if (this.creep.memory.upgrading) {
      if (this.creep.upgradeController(<StructureController>this.creep.room.controller) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(<StructureController>this.creep.room.controller, { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
    else {
      this.getResources(sources);
    }
  }

  /**
   * 获取资源
   * 如果存在 Carry，从存储容器获取
   * 否则直接从 Source 采集
   */
  private getResources(sources: Array<Source>) {
    var homeroom = this.creep.memory.homeRoom
    var hasCarry = CreepUtils.hasCarryByRoom(homeroom);

    if (hasCarry) {
      // 有 Carry 角色时，从存储容器获取资源
      var success = CreepUtils.withdrawFromStorage(this.creep, this.storagePriority, { stroke: '#ffaa00' });
      if (!success) {
        // 如果没有可用的存储结构，回退到直接采集
        CreepUtils.harvestFromSource(this.creep, sources, 0, { stroke: '#ffaa00' });
      }
    } else {
      // 没有 Carry 角色时，直接从 Source 采集
      CreepUtils.harvestFromSource(this.creep, sources, 0, { stroke: '#ffaa00' });
    }
  }
}
