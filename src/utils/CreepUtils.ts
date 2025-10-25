import { CommonConstant } from "../common/CommonConstant";

export class CreepUtils {
  /**
   * 检查场上是否存在指定角色的 creep
   * @param role 要检查的角色名称
   * @returns 是否存在该角色的 creep
   */
  static hasRole(role: string): boolean {
    for (var creepName in Game.creeps) {
      var creep = Game.creeps[creepName];
      if (creep.memory.role === role) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查场上是否存在 Carry 角色
   * @returns 是否存在 Carry 角色
   */
  static hasCarry(): boolean {
    return this.hasRole(CommonConstant.CARRY);
  }

  /**
   * 查找有资源的存储结构，按优先级排序
   * @param creep 要查找的 creep
   * @param priority 优先级映射表，数字越小优先级越高
   * @returns 按优先级和距离排序的存储结构列表
   */
  static findStorageStructures(creep: Creep, priority: { [key: string]: number }): any[] {
    var targets = creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 只考虑有存储容量且有能量的结构
        if ("store" in structure) {
          var store = structure as any;
          return store.store[RESOURCE_ENERGY] > 0;
        }
        return false;
      }
    });

    if (targets.length > 0) {
      // 按优先级和距离排序
      targets.sort((a, b) => {
        // 获取类型优先级，未定义的类型优先级为Infinity
        var a_priority = priority[a.structureType] ?? Infinity;
        var b_priority = priority[b.structureType] ?? Infinity;

        // 先按类型优先级排序
        if (a_priority !== b_priority) {
          return a_priority - b_priority;
        }

        // 优先级相同时按距离排序
        var a_distance = Math.abs(creep.pos.x - a.pos.x) + Math.abs(creep.pos.y - a.pos.y);
        var b_distance = Math.abs(creep.pos.x - b.pos.x) + Math.abs(creep.pos.y - b.pos.y);
        return a_distance - b_distance;
      });
    }

    return targets;
  }

  /**
   * 从存储结构中获取资源的通用方法
   * @param creep 要执行操作的 creep
   * @param priority 存储结构优先级映射表
   * @param visualizePathStyle 路径可视化样式
   * @returns 是否成功开始获取资源
   */
  static withdrawFromStorage(creep: Creep, priority: { [key: string]: number }, visualizePathStyle: { stroke: string }): boolean {
    var targets = this.findStorageStructures(creep, priority);

    if (targets.length > 0) {
      var target = targets[0];
      if (creep.withdraw(target as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: visualizePathStyle });
      }
      return true;
    }

    return false;
  }

  /**
   * 直接从 Source 采集资源的通用方法
   * @param creep 要执行操作的 creep
   * @param sources Source 列表
   * @param sourceIndex 要采集的 Source 索引
   * @param visualizePathStyle 路径可视化样式
   * @returns 是否成功开始采集
   */
  static harvestFromSource(creep: Creep, sources: Array<Source>, sourceIndex: number, visualizePathStyle: { stroke: string }): boolean {
    if (sources[sourceIndex]) {
      if (creep.harvest(sources[sourceIndex]) == ERR_NOT_IN_RANGE) {
        creep.moveTo(sources[sourceIndex], { visualizePathStyle: visualizePathStyle });
      }
      return true;
    }
    return false;
  }
}