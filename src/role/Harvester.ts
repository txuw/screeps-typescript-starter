import { CommonConstant } from "../common/CommonConstant";
import { CreepUtils } from "../utils/CreepUtils";

export class Harvester {
  creep: Creep

  // 能量存储结构优先级映射表，数字越小优先级越高
  structurePriority: { [key: string]: number } = {
    [STRUCTURE_SPAWN]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_CONTAINER]: 2
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  harvest(sources: Array<Source>) {
    // 如果没有目标采集点，分配一个最优的采集点
    if (!this.creep.memory.targetSourceId) {
      this.assignOptimalSource(sources);
    }

    // 获取目标采集点
    var targetSource = Game.getObjectById(this.creep.memory.targetSourceId as Id<Source>);

    // 如果目标采集点不存在，重新分配
    if (!targetSource) {
      this.assignOptimalSource(sources);
      targetSource = Game.getObjectById(this.creep.memory.targetSourceId as Id<Source>);
    }

    if (this.creep.store.getUsedCapacity() < this.creep.store.getCapacity()) {
      // 前往目标采集点采集资源
      if (targetSource) {
        if (this.creep.harvest(targetSource) == ERR_NOT_IN_RANGE) {
          this.creep.moveTo(targetSource, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
    } else {
      // 满载时转移能量
      this.transferEnergy();
    }
  }

  /**
   * 分配最优的采集点
   * 算法：选择当前 Harvester 数量最少的 Source
   */
  private assignOptimalSource(sources: Array<Source>) {
    var sourceStats: { [sourceId: string]: number } = {};

    // 初始化统计数据
    for (var source of sources) {
      sourceStats[source.id] = 0;
    }

    // 统计当前各 Source 点的 Harvester 数量
    for (var creepName in Game.creeps) {
      var creep = Game.creeps[creepName];
      if (creep.memory.role === 'harvester' && creep.memory.targetSourceId) {
        sourceStats[creep.memory.targetSourceId] = (sourceStats[creep.memory.targetSourceId] || 0) + 1;
      }
    }

    // 找到 Harvester 数量最少的 Source
    var optimalSource = sources[0];
    var minHarvesters = sourceStats[optimalSource.id];

    for (var i = 1; i < sources.length; i++) {
      var currentHarvesters = sourceStats[sources[i].id];

      if (currentHarvesters < minHarvesters) {
        optimalSource = sources[i];
        minHarvesters = currentHarvesters;
      } else if (currentHarvesters === minHarvesters) {
        // 如果数量相同，选择距离更近的
        var currentDistance = Math.abs(this.creep.pos.x - sources[i].pos.x) + Math.abs(this.creep.pos.y - sources[i].pos.y);
        var optimalDistance = Math.abs(this.creep.pos.x - optimalSource.pos.x) + Math.abs(this.creep.pos.y - optimalSource.pos.y);

        if (currentDistance < optimalDistance) {
          optimalSource = sources[i];
        }
      }
    }

    // 分配最优采集点
    this.creep.memory.targetSourceId = optimalSource.id;
    console.log(`Harvester ${this.creep.name} assigned to source ${optimalSource.id}`);
  }

  /**
   * 转移能量
   * 如果存在 Carry 角色，只转移到 Container
   * 否则使用原有的优先级逻辑
   */
  private transferEnergy() {
    // 检查是否存在 Carry 角色
    var hasCarry = CreepUtils.hasCarry();

    if (hasCarry) {
      // 有 Carry 角色时，只转移到 Container
      this.transferToContainer();
    } else {
      // 没有 Carry 角色时，使用原有的优先级逻辑
      this.transferWithPriority();
    }
  }

  
  /**
   * 转移能量到最近的 Container
   */
  private transferToContainer() {
    var containers = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_CONTAINER &&
                          (structure as any).store[RESOURCE_ENERGY] < (structure as any).store.getCapacity(RESOURCE_ENERGY)
    });

    if (containers.length > 0) {
      // 按距离排序，选择最近的 Container
      containers.sort((a, b) => {
        var a_distance = Math.abs(this.creep.pos.x - a.pos.x) + Math.abs(this.creep.pos.y - a.pos.y);
        var b_distance = Math.abs(this.creep.pos.x - b.pos.x) + Math.abs(this.creep.pos.y - b.pos.y);
        return a_distance - b_distance;
      });

      // 转移能量到最近的 Container
      if (this.creep.transfer(containers[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(containers[0], { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
  }

  /**
   * 使用原有的优先级逻辑转移能量
   */
  private transferWithPriority() {
    // 统一查找所有需要能量的结构
    var targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 只考虑有存储容量且需要能量的结构
        if ("store" in structure) {
          var store = structure as any;
          return store.store[RESOURCE_ENERGY] < store.store.getCapacity(RESOURCE_ENERGY);
        }
        return false;
      }
    });

    if (targets.length > 0) {
      // 按优先级和距离排序
      targets.sort((a, b) => {
        // 获取类型优先级，未定义的类型优先级为Infinity
        var a_priority = this.structurePriority[a.structureType] ?? Infinity;
        var b_priority = this.structurePriority[b.structureType] ?? Infinity;

        // 先按类型优先级排序
        if (a_priority !== b_priority) {
          return a_priority - b_priority;
        }

        // 优先级相同时按距离排序
        var a_distance = Math.abs(this.creep.pos.x - a.pos.x) + Math.abs(this.creep.pos.y - a.pos.y);
        var b_distance = Math.abs(this.creep.pos.x - b.pos.x) + Math.abs(this.creep.pos.y - b.pos.y);
        return a_distance - b_distance;
      });

      // 转移能量到最高优先级且最近的目标
      if (this.creep.transfer(targets[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(targets[0], { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
  }
}