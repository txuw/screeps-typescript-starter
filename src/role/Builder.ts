import { CreepUtils } from "../utils/CreepUtils";

export class Builder {
  creep: Creep

  // 结构类型优先级映射表，数字越小优先级越高
  structurePriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_RAMPART]: 4,
    [STRUCTURE_ROAD]: 3,
    [STRUCTURE_LINK]: 5,
    [STRUCTURE_TOWER]: 2
  };

  // 存储结构优先级映射表（用于获取资源），数字越小优先级越高
  storagePriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 1,
    [STRUCTURE_STORAGE]: 0
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  build(sources: Array<Source>) {
    if (this.creep.memory.building && this.creep.store.getUsedCapacity() == 0) {
      this.creep.memory.building = false;
      this.creep.say('🔄 harvest');
    }
    if (!this.creep.memory.building && this.creep.store.getUsedCapacity() == this.creep.store.getCapacity()) {
      this.creep.memory.building = true;
      this.creep.say('🚧 build');
    }

    if (this.creep.memory.building) {
      var targets = this.creep.room.find(FIND_CONSTRUCTION_SITES);
      if (targets.length) {

        targets.sort((a, b) => {
          // 获取类型优先级，未定义的类型优先级为Infinity
          const a_priority = this.structurePriority[a.structureType] ?? Infinity;
          const b_priority = this.structurePriority[b.structureType] ?? Infinity;

          // 先按类型优先级排序
          if (a_priority !== b_priority) {
            return a_priority - b_priority;
          }

          // 优先级相同时按距离排序
          const a_distance = Math.abs(this.creep.pos.x - a.pos.x) + Math.abs(this.creep.pos.y - a.pos.y);
          const b_distance = Math.abs(this.creep.pos.x - b.pos.x) + Math.abs(this.creep.pos.y - b.pos.y);
          return a_distance - b_distance;
        })
        if (this.creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          this.creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
        }
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
