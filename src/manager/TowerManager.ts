import { CommonConstant } from "../common/CommonConstant";

export interface TowerConfig {
  allyOwners: string[];
  repairThresholds: { [structureType: string]: number };
  minEnergyForAction: number;
  structureRepairPriority: { [structureType: string]: number };
}

export class TowerManager {
  private static instance: TowerManager;
  private config: TowerConfig;

  private constructor() {
    this.config = {
      allyOwners: ["txuw"],
      repairThresholds: {
        [STRUCTURE_WALL]: 0.3,
        [STRUCTURE_RAMPART]: 0.2,
        [STRUCTURE_TOWER]: 0.5,
        [STRUCTURE_CONTAINER]: 0.7,
        [STRUCTURE_STORAGE]: 0.8,
        [STRUCTURE_SPAWN]: 0.8,
        [STRUCTURE_EXTENSION]: 0.8,
        [STRUCTURE_LINK]: 0.8,
        [STRUCTURE_EXTRACTOR]: 0.8,
        [STRUCTURE_LAB]: 0.8,
        [STRUCTURE_TERMINAL]: 0.8,
        [STRUCTURE_OBSERVER]: 0.8,
        [STRUCTURE_POWER_SPAWN]: 0.4,
        [STRUCTURE_NUKER]: 0.8,
        [STRUCTURE_ROAD]: 0.2
      },
      // 建筑修复优先级：数字越小优先级越高
      structureRepairPriority: {
        [STRUCTURE_TOWER]: 0,        // 塔最高优先级
        [STRUCTURE_SPAWN]: 1,        // 孵化器次高优先级
        [STRUCTURE_EXTENSION]: 2,    // 扩展位
        [STRUCTURE_STORAGE]: 3,      // 存储器
        [STRUCTURE_POWER_SPAWN]: 4,  // 能量孵化器
        [STRUCTURE_NUKER]: 5,        // 核弹发射器
        [STRUCTURE_TERMINAL]: 6,     // 终端
        [STRUCTURE_LAB]: 7,          // 实验室
        [STRUCTURE_LINK]: 8,         // 链接
        [STRUCTURE_CONTAINER]: 9,    // 容器
        [STRUCTURE_RAMPART]: 11,     // 防御墙
        [STRUCTURE_ROAD]: 10,        // 路
        [STRUCTURE_EXTRACTOR]: 12,   // 采集器
        [STRUCTURE_OBSERVER]: 13,     // 观察者
      },
      minEnergyForAction: 10
    };
  }

  public static getInstance(): TowerManager {
    if (!TowerManager.instance) {
      TowerManager.instance = new TowerManager();
    }
    return TowerManager.instance;
  }

  /**
   * 管理指定房间内所有的塔
   * @param roomName 房间名称
   */
  public manageRoomTowers(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room) {
      console.log(`Room ${roomName} not found or not visible`);
      return;
    }

    // 获取房间内所有的塔
    const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_TOWER
    });

    for (const tower of towers) {
      this.manageTower(tower);
    }
  }

  /**
   * 管理单个塔的行为
   * @param tower 塔对象
   */
  private manageTower(tower: StructureTower): void {
    // 检查塔是否有足够的能量
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < this.config.minEnergyForAction) {
      return;
    }

    // 优先级0: 攻击敌人
    if (this.handleDefense(tower)) {
      return;
    }

    // 优先级1: 修复建筑
    if (this.handleRepair(tower)) {
      return;
    }

    // 优先级2: 治疗友军
    if (this.handleHeal(tower)) {
      return;
    }
  }

  /**
   * 处理防御 - 攻击敌人
   * @param tower 塔对象
   * @returns 是否执行了攻击
   */
  private handleDefense(tower: StructureTower): boolean {
    // 查找房间内的敌人creep
    const hostileCreeps = tower.room.find(FIND_HOSTILE_CREEPS, {
      filter: creep => !this.config.allyOwners.includes(creep.owner.username)
    });

    if (hostileCreeps.length > 0) {
      // 攻击最近的敌人
      const target = this.findClosest(tower.pos, hostileCreeps);
      if (target) {
        const result = tower.attack(target);
        if (result === OK) {
          console.log(`Tower ${tower.id} attacking hostile creep ${target.name}`);
          return true;
        } else {
          console.log(`Tower ${tower.id} failed to attack: ${result}`);
        }
      }
    }

    return false;
  }

  /**
   * 处理修复 - 修复损坏的建筑
   * 优先级：1. 建筑类型优先级 2. 血量占比（低优先） 3. 距离（近优先）
   * @param tower 塔对象
   * @returns 是否执行了修复
   */
  private handleRepair(tower: StructureTower): boolean {
    // 查找需要修复的建筑
    const damagedStructures = tower.room.find(FIND_STRUCTURES, {
      filter: structure => {
        // 排除自己
        if (structure.id === tower.id) {
          return false;
        }

        // 检查建筑是否有血量属性
        if (!('hits' in structure) || !('hitsMax' in structure)) {
          return false;
        }

        // 获取修复阈值
        const threshold = this.config.repairThresholds[structure.structureType] || 0.8;
        const healthRatio = structure.hits / structure.hitsMax;

        return healthRatio < threshold;
      }
    });

    if (damagedStructures.length > 0) {
      // 计算每个受损建筑的优先级分数并排序
      const sortedStructures = damagedStructures.map(structure => {
        const healthRatio = structure.hits / structure.hitsMax;
        const distance = this.calculateDistance(tower.pos, structure.pos);
        const structurePriority = this.config.structureRepairPriority[structure.structureType] ?? 999;

        // 优先级计算：建筑类型优先级 * 1000 + (1 - 血量占比) * 100 + 距离
        // 这样确保：1. 建筑类型优先级最高 2. 血量占比次之 3. 距离最后
        const priorityScore = structurePriority * 1000 + (1 - healthRatio) * 100 + distance;

        return {
          structure,
          healthRatio,
          distance,
          structurePriority,
          priorityScore
        };
      }).sort((a, b) => a.priorityScore - b.priorityScore); // 分数越小优先级越高

      const target = sortedStructures[0].structure;
      const targetInfo = sortedStructures[0];

      const result = tower.repair(target);
      if (result === OK) {
        console.log(`Tower ${tower.id} repairing ${target.structureType} (priority: ${targetInfo.structurePriority}, health: ${Math.round(targetInfo.healthRatio * 100)}%, distance: ${targetInfo.distance})`);
        return true;
      } else {
        console.log(`Tower ${tower.id} failed to repair: ${result}`);
      }
    }

    return false;
  }

  /**
   * 处理治疗 - 治疗友军creep
   * @param tower 塔对象
   * @returns 是否执行了治疗
   */
  private handleHeal(tower: StructureTower): boolean {
    // 查找需要治疗的友军creep
    const friendlyCreeps = tower.room.find(FIND_MY_CREEPS, {
      filter: creep => creep.hits < creep.hitsMax
    });

    // 如果没有找到友军，查找盟友的creep
    const allyCreeps = tower.room.find(FIND_HOSTILE_CREEPS, {
      filter: creep =>
        this.config.allyOwners.includes(creep.owner.username) &&
        creep.hits < creep.hitsMax
    });

    const allFriendlyCreeps = [...friendlyCreeps, ...allyCreeps];

    if (allFriendlyCreeps.length > 0) {
      // 治疗最近的友军
      const target = this.findClosest(tower.pos, allFriendlyCreeps);
      if (target) {
        const result = tower.heal(target);
        if (result === OK) {
          console.log(`Tower ${tower.id} healing creep ${target.name} (${Math.round((target.hits / target.hitsMax) * 100)}% health)`);
          return true;
        } else {
          console.log(`Tower ${tower.id} failed to heal: ${result}`);
        }
      }
    }

    return false;
  }

  /**
   * 找到距离指定位置最近的目标
   * @param pos 参考位置
   * @param targets 目标列表
   * @returns 最近的目标
   */
  private findClosest<T extends { pos: RoomPosition }>(pos: RoomPosition, targets: T[]): T | null {
    if (targets.length === 0) {
      return null;
    }

    let closest = targets[0];
    let minDistance = this.calculateDistance(pos, closest.pos);

    for (let i = 1; i < targets.length; i++) {
      const distance = this.calculateDistance(pos, targets[i].pos);
      if (distance < minDistance) {
        minDistance = distance;
        closest = targets[i];
      }
    }

    return closest;
  }

  /**
   * 计算两个位置之间的曼哈顿距离
   * @param pos1 位置1
   * @param pos2 位置2
   * @returns 曼哈顿距离
   */
  private calculateDistance(pos1: RoomPosition, pos2: RoomPosition): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * 更新配置
   * @param newConfig 新的配置
   */
  public updateConfig(newConfig: Partial<TowerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('TowerManager configuration updated:', newConfig);
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): TowerConfig {
    return { ...this.config };
  }

  /**
   * 添加盟友owner
   * @param ownerName 盟友名称
   */
  public addAllyOwner(ownerName: string): void {
    if (!this.config.allyOwners.includes(ownerName)) {
      this.config.allyOwners.push(ownerName);
      console.log(`Added ally owner: ${ownerName}`);
    }
  }

  /**
   * 移除盟友owner
   * @param ownerName 盟友名称
   */
  public removeAllyOwner(ownerName: string): void {
    const index = this.config.allyOwners.indexOf(ownerName);
    if (index > -1) {
      this.config.allyOwners.splice(index, 1);
      console.log(`Removed ally owner: ${ownerName}`);
    }
  }
}
