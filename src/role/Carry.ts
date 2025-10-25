export class Carry {
  creep: Creep

  // 能量存储结构优先级映射表（withdraw目标），数字越小优先级越高
  withdrawPriority: { [key: string]: number } = {
    [STRUCTURE_CONTAINER]: 0,
    [STRUCTURE_STORAGE]: 1
  };

  // 能量接收建筑优先级映射表（transfer目标），数字越小优先级越高
  transferPriority: { [key: string]: number } = {
    [STRUCTURE_SPAWN]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_TOWER]: 2
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  transport(sources: Array<Source>) {
    if (this.creep.memory.working && this.creep.store.getUsedCapacity() == 0) {
      this.creep.memory.working = false;
      this.creep.say('🔄 withdraw');
    }
    if (!this.creep.memory.working && this.creep.store.getUsedCapacity() == this.creep.store.getCapacity()) {
      this.creep.memory.working = true;
      this.creep.say('📦 transfer');
    }

    if (this.creep.memory.working) {
      this.performTransfer();
    }
    else {
      this.performWithdraw();
    }
  }

  private performWithdraw() {
    // 查找所有有能量的存储结构
    var targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 只考虑有存储容量且有能量的结构
        if ("store" in structure) {
          const store = structure as any;
          return store.store[RESOURCE_ENERGY] > 0;
        }
        return false;
      }
    });

    if (targets.length > 0) {
      // 按优先级和距离排序
      targets.sort((a, b) => {
        // 获取类型优先级，未定义的类型优先级为Infinity
        const a_priority = this.withdrawPriority[a.structureType] ?? Infinity;
        const b_priority = this.withdrawPriority[b.structureType] ?? Infinity;

        // 先按类型优先级排序
        if (a_priority !== b_priority) {
          return a_priority - b_priority;
        }

        // 优先级相同时按距离排序
        const a_distance = Math.abs(this.creep.pos.x - a.pos.x) + Math.abs(this.creep.pos.y - a.pos.y);
        const b_distance = Math.abs(this.creep.pos.x - b.pos.x) + Math.abs(this.creep.pos.y - b.pos.y);
        return a_distance - b_distance;
      });

      // 从最高优先级且最近的目标提取能量
      if (this.creep.withdraw(targets[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ff8800' } });
      }
    }
  }

  private performTransfer() {
    // 查找所有需要能量的结构
    var targets = this.creep.room.find(FIND_STRUCTURES, {
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
        const a_priority = this.transferPriority[a.structureType] ?? Infinity;
        const b_priority = this.transferPriority[b.structureType] ?? Infinity;

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
      if (this.creep.transfer(targets[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#00ff88' } });
      }
    }
  }
}
