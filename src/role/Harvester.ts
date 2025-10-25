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

  // Source 分分配算法配置参数
  private static readonly DISTANCE_FACTOR = 2.0; // 距离系数：每距离10格需要多少个额外Harvester
  private static readonly BASE_HARVESTERS = 1; // 基础Harvester数量
  private static readonly MIN_HARVESTERS = 1; // 最少Harvester数量
  private static readonly MAX_HARVESTERS = 4; // 最多Harvester数量

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
   * 算法：考虑距离因素，距离远的 Source 需要更多 Harvester 来维持资源产出
   */
  private assignOptimalSource(sources: Array<Source>) {
    var sourceStats: { [sourceId: string]: { current: number; expected: number; distance: number } } = {};

    // 找到 Spawn 位置作为距离计算基准
    var spawnPos = this.getSpawnPosition();

    // 初始化统计数据
    for (var source of sources) {
      var distance = this.calculateDistance(spawnPos, source.pos);
      // 期望 Harvester 数量计算公式：
      // expected = BASE_HARVESTERS + (distance / 10) * DISTANCE_FACTOR
      // 然后限制在 MIN_HARVESTERS 和 MAX_HARVESTERS 之间
      var expectedHarvesters = Math.round(
        Harvester.BASE_HARVESTERS + (distance / 10) * Harvester.DISTANCE_FACTOR
      );
      expectedHarvesters = Math.max(
        Harvester.MIN_HARVESTERS,
        Math.min(Harvester.MAX_HARVESTERS, expectedHarvesters)
      );

      sourceStats[source.id] = {
        current: 0,
        expected: expectedHarvesters,
        distance: distance
      };
    }

    // 统计当前各 Source 点的 Harvester 数量
    for (var creepName in Game.creeps) {
      var creep = Game.creeps[creepName];
      if (creep.memory.role === CommonConstant.HARVESTER && creep.memory.targetSourceId) {
        if (sourceStats[creep.memory.targetSourceId]) {
          sourceStats[creep.memory.targetSourceId].current++;
        }
      }
    }

    // 找到最需要 Harvester 的 Source
    var optimalSource = sources[0];
    var maxDeficit = this.calculateDeficit(sourceStats[optimalSource.id]);

    for (var i = 1; i < sources.length; i++) {
      var currentDeficit = this.calculateDeficit(sourceStats[sources[i].id]);

      if (currentDeficit > maxDeficit) {
        optimalSource = sources[i];
        maxDeficit = currentDeficit;
      } else if (currentDeficit === maxDeficit) {
        // 如果缺口相同，选择距离 Spawn 更近的（优先发展近距离资源）
        if (sourceStats[sources[i].id].distance < sourceStats[optimalSource.id].distance) {
          optimalSource = sources[i];
        }
      }
    }

    // 分配最优采集点
    this.creep.memory.targetSourceId = optimalSource.id;
    var stat = sourceStats[optimalSource.id];
    console.log(`Harvester ${this.creep.name} assigned to source ${optimalSource.id} (distance: ${stat.distance}, current: ${stat.current}, expected: ${stat.expected})`);
  }

  /**
   * 获取 Spawn 位置
   */
  private getSpawnPosition(): RoomPosition {
    // 寻找第一个可用的 Spawn
    for (var spawnName in Game.spawns) {
      var spawn = Game.spawns[spawnName];
      if (spawn && spawn.pos) {
        return spawn.pos;
      }
    }

    // 如果没有 Spawn，使用当前 creep 的位置作为备选
    return this.creep.pos;
  }

  /**
   * 计算两个位置之间的曼哈顿距离
   */
  private calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * 计算 Harvester 缺口数量
   * 正数表示缺少 Harvester，负数表示 Harvester 过剩
   */
  private calculateDeficit(stat: { current: number; expected: number; distance: number }): number {
    return stat.expected - stat.current;
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
