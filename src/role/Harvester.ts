export class Harvester {
  private creep: Creep;

  // 能量存储结构优先级映射表，数字越小优先级越高
  private structurePriority: { [key: string]: number } = {
    [STRUCTURE_SPAWN]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_CONTAINER]: 2
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  harvest(sources: Array<Source>) {
    if (this.creep.store.getUsedCapacity() < this.creep.store.getCapacity()) {
      if (this.creep.harvest(sources[1]) === ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sources[1], { visualizePathStyle: { stroke: "#ffaa00" } });
      }
    } else {
      // 统一查找所有需要能量的结构
      const targets = this.creep.room.find(FIND_STRUCTURES, {
        filter: structure => {
          // 只考虑有存储容量且需要能量的结构
          if ("store" in structure) {
            const store = structure as any;
            return store.store[RESOURCE_ENERGY] < store.store.getCapacity(RESOURCE_ENERGY);
          }
          return false;
        }
      });

      if (targets.length > 0) {
        // 按优先级和距离排序
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
        });

        // 转移能量到最高优先级且最近的目标
        if (this.creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(targets[0], { visualizePathStyle: { stroke: "#ffffff" } });
        }
      }
    }
  }
}
