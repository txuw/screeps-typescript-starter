import { CommonConstant } from "../common/CommonConstant";
import { CreepUtils } from "../utils/CreepUtils";
import { SourceUtils } from "../utils/SourceUtils";
import { ROLE_NAMES } from "../config/GlobalConstants";
import { CarryUtils } from "../utils/CarryUtils";

export class Harvester {
  creep: Creep

  // 能量存储结构优先级映射表，数字越小优先级越高
  structurePriority: { [key: string]: number } = {
    [STRUCTURE_SPAWN]: 0,
    [STRUCTURE_EXTENSION]: 1,
    [STRUCTURE_LINK]: 2,
    [STRUCTURE_CONTAINER]: 3
  };

  constructor(creep: Creep) {
    this.creep = creep;
  }

  harvest(sources?: Array<Source>) {
    // 动态获取房间内的Source列表（不再依赖传入的sources参数）
    const roomSources = sources || SourceUtils.getRoomSources(this.creep.room);

    if (roomSources.length === 0) {
      console.log(`No sources found in room ${this.creep.room.name}`);
      return;
    }

    // 如果没有目标采集点，分配一个最优的采集点
    if (!this.creep.memory.targetSourceId) {
      this.assignOptimalSource(roomSources);
    }

    // 获取目标采集点
    let targetSource = Game.getObjectById(this.creep.memory.targetSourceId as Id<Source>);

    // 如果目标采集点不存在，重新分配
    if (!targetSource) {
      this.assignOptimalSource(roomSources);
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
   * 使用SourceUtils的通用算法
   */
  private assignOptimalSource(sources: Array<Source>) {
    const assignedSource = SourceUtils.assignOptimalSource(this.creep, sources, CommonConstant.HARVESTER);
    if (!assignedSource) {
      console.log(`Failed to assign source to harvester ${this.creep.name}`);
    }
  }

  /**
   * 转移能量
   * 如果存在 Carry 角色，只转移到 Container
   * 否则使用原有的优先级逻辑
   */
  private transferEnergy() {
    // 目标房间为creep的homeRoom（若无则为当前房间）
    const homeRoomName = this.creep.memory.homeRoom || this.creep.room.name;

    // 不在homeRoom则优先回家再进行能量转移
    if (this.creep.room.name !== homeRoomName) {
      const homeRoom = Game.rooms[homeRoomName];
      if (homeRoom) {
        const spawn = homeRoom.find(FIND_MY_SPAWNS)[0];
        const targetPos = spawn ? spawn.pos : new RoomPosition(25, 25, homeRoomName);
        this.creep.moveTo(targetPos, { visualizePathStyle: { stroke: '#ffffff' } });
      } else {
        // 若暂未可见homeRoom，则朝homeRoom中央移动
        this.creep.moveTo(new RoomPosition(25, 25, homeRoomName), { visualizePathStyle: { stroke: '#ffffff' } });
      }
      return;
    }

    // 仅统计同一homeRoom内是否存在Carry角色
    const hasCarry = CreepUtils.hasCarryByRoom(homeRoomName);
    if (hasCarry) {
      // 有 Carry 角色时，只转移到 Container
      this.transferToContainer();
    } else {
      // 没有 Carry 角色时，使用原有的优先级逻辑
      this.transferWithPriority();
    }
  }

  /**
   * 转移能量到最近的存储结构
   * 优先级：Link > Container
   * 使用SourceUtils的通用方法
   */
  private transferToContainer() {
    // 首先尝试找到3*3范围内的Link
    const nearbyLinks = this.findNearbyLinks();

    if (nearbyLinks.length > 0) {
      // 优先使用Link
      const nearestLink = SourceUtils.sortByPriority(
        nearbyLinks,
        { [STRUCTURE_LINK]: 0 },
        this.creep.pos
      )[0];

      if (this.creep.transfer(nearestLink, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(nearestLink, { visualizePathStyle: { stroke: '#00ff00' } });
      }
      return;
    }

    // 如果没有Link，使用Container
    const needyContainers = SourceUtils.findNeedyContainers(this.creep);

    if (needyContainers.length > 0) {
      // 使用SourceUtils的距离排序方法找到最近的Container
      const nearestContainer = SourceUtils.sortByPriority(
        needyContainers,
        { [STRUCTURE_CONTAINER]: 0 },
        this.creep.pos
      )[0];

      // 转移能量到最近的 Container
      if (this.creep.transfer(nearestContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(nearestContainer, { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
  }

  /**
   * 查找3*3范围内需要能量的Link
   * @returns 需要能量的Link数组
   */
  private findNearbyLinks(): StructureLink[] {
    const nearbyStructures = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 只考虑Link且在3*3范围内
        if (structure.structureType !== STRUCTURE_LINK) {
          return false;
        }

        const distance = Math.abs(this.creep.pos.x - structure.pos.x) +
                        Math.abs(this.creep.pos.y - structure.pos.y);
        if (distance > 3) {
          return false;
        }

        // 检查Link是否需要能量
        const link = structure as StructureLink;
        const currentEnergy = link.store.getUsedCapacity(RESOURCE_ENERGY);
        const maxEnergy = link.store.getCapacity(RESOURCE_ENERGY);

        return currentEnergy < maxEnergy;
      }
    });

    return nearbyStructures as StructureLink[];
  }

  /**
   * 使用原有的优先级逻辑转移能量
   * 使用SourceUtils的通用排序方法
   */
  private transferWithPriority() {

    // 统一查找所有需要能量的结构
    const targets = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => {

        // 只考虑有存储容量且需要能量的结构
        if ("store" in structure ) {

          const store = structure as any;
          return store.store[RESOURCE_ENERGY] < store.store.getCapacity(RESOURCE_ENERGY);
        }
        return false;
      }
    });

    if (targets.length > 0) {
      // 使用SourceUtils的优先级排序方法
      const sortedTargets = SourceUtils.sortByPriority(targets, this.structurePriority, this.creep.pos);

      // 转移能量到最高优先级且最近的目标
      if (this.creep.transfer(sortedTargets[0] as any, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        this.creep.moveTo(sortedTargets[0], { visualizePathStyle: { stroke: '#ffffff' } });
      }
    }
  }
}
