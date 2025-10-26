import { SourceUtils } from "../utils/SourceUtils";
import { CarryUtils } from "../utils/CarryUtils";
import { CommonConstant } from "../common/CommonConstant";

export class StorageCarry {
  creep: Creep

  // 能量存储结构优先级映射表（withdraw目标），数字越小优先级越高
  withdrawPriority: { [key: string]: number } = {
    [STRUCTURE_STORAGE]: 0
  };

  // 能量接收建筑基础优先级映射表（transfer目标），数字越小优先级越高
  baseTransferPriority: { [key: string]: number } = {
    [STRUCTURE_SPAWN]: 0,        // 最高优先级，关系到creep生产
    [STRUCTURE_EXTENSION]: 1,    // 第二优先级，关系到creep生产
    [STRUCTURE_TOWER]: 2         // 最低优先级，防御功能
  };

  // Tower低能量阈值
  private readonly TOWER_LOW_ENERGY_THRESHOLD = 50; // 50%

  constructor(creep: Creep) {
    this.creep = creep;
  }

  transport(sources?: Array<Source>) {
    const isWorking = CarryUtils.checkWorkingState(this.creep, '🔄 fromStorage', '📦 transfer');

    if (isWorking) {
      this.performTransfer();
    }
    else {
      this.performWithdraw();
    }
  }

  private performWithdraw() {
    // 查找Storage作为唯一能量源
    const storages = CarryUtils.findAvailableStructures(
      this.creep,
      [STRUCTURE_STORAGE],
      (structure) => CarryUtils.structureHasEnergy(structure, 1)
    );

    if (storages.length > 0) {
      const storage = storages[0];
      const energyPercentage = CarryUtils.calculateEnergyPercentage(storage);

      // 检查Storage是否有足够能量（超过0%）
      if (CarryUtils.waitForResourceAvailable(
        this.creep,
        storage,
        (s) => CarryUtils.calculateEnergyPercentage(s) > 0,
        '⚠️ low storage',
        `StorageCarry ${this.creep.name} waiting, storage energy is low: ${energyPercentage.toFixed(1)}%`
      )) {
        // 有足够能量，提取
        CarryUtils.moveToAndWithdraw(this.creep, storage, RESOURCE_ENERGY, { stroke: '#ffaa00' });
      }
    } else {
      // 没有Storage或Storage为空，进行智能等待
      CarryUtils.smartWaiting(
        this.creep,
        true,
        '💤 no storage',
        `StorageCarry ${this.creep.name} no available storage found`
      );
    }
  }

  private performTransfer() {
    // 获取动态调整后的优先级
    // const dynamicPriority = this.getDynamicTransferPriority();

    // 定义需要排除的结构类型（Storage）
    const excludedTypes = [STRUCTURE_STORAGE];

    // 获取所有结构类型
    const allTypes = Object.keys(this.baseTransferPriority).filter(type => !excludedTypes.includes(type as any));

    // 查找所有需要能量的结构
    const targets = CarryUtils.findAvailableStructures(
      this.creep,
      allTypes as any[],
      (structure) => CarryUtils.structureNeedsEnergy(structure)
    );

    if (targets.length > 0) {
      // 使用动态优先级排序方法
      const sortedTargets = CarryUtils.sortStructuresByPriority(targets, this.baseTransferPriority, this.creep.pos);
      const target = sortedTargets[0];

      // // 记录选择的Target类型和优先级原因
      // const targetType = target.structureType;
      // const priority = dynamicPriority[targetType];
      // let priorityReason = "";

      // if (targetType === STRUCTURE_TOWER && priority === -1) {
      //   priorityReason = " (Tower low energy - highest priority)";
      // } else if (targetType === STRUCTURE_SPAWN) {
      //   priorityReason = " (Spawn production priority)";
      // } else if (targetType === STRUCTURE_EXTENSION) {
      //   priorityReason = " (Extension priority)";
      // }
      //
      // console.log(`StorageCarry ${this.creep.name} transferring to ${targetType}${priorityReason}`);

      // 转移能量到选定的目标
      CarryUtils.moveToAndTransfer(this.creep, target);
    } else {
      // 没有需要能量的建筑，进行智能等待
      CarryUtils.smartWaiting(
        this.creep,
        true,
        '💤 idle',
        `StorageCarry ${this.creep.name} no buildings need energy`
      );
    }
  }

  /**
   * 获取动态调整后的优先级映射表
   * 当Tower能量低于阈值时，提高其优先级
   * @returns 动态优先级映射表
   */
  private getDynamicTransferPriority(): { [key: string]: number } {
    const dynamicPriority = { ...this.baseTransferPriority };

    // 检查所有Tower的能量状态
    const towers = this.creep.room.find(FIND_STRUCTURES, {
      filter: structure => structure.structureType === STRUCTURE_TOWER
    }) as StructureTower[];

    for (const tower of towers) {
      const energyPercentage = CarryUtils.calculateEnergyPercentage(tower);

      // 当Tower能量低于阈值时，提高其优先级到最高
      if (energyPercentage < this.TOWER_LOW_ENERGY_THRESHOLD) {
        dynamicPriority[STRUCTURE_TOWER] = -1; // 负数优先级，确保排在最前面
        console.log(`StorageCarry ${this.creep.name}: Tower ${tower.id} energy low (${energyPercentage.toFixed(1)}%), raising priority to highest`);
        break; // 找到一个低能量Tower就足够了
      }
    }

    return dynamicPriority;
  }

  /**
   * 获取房间内需要能量的建筑统计
   * 用于智能分配StorageCarry的工作优先级
   * @returns 建筑需求统计
   */
  private getBuildingNeedsStatistics(): { [structureType: string]: { count: number; totalDeficit: number; priority: number } } {
    const needs: { [structureType: string]: { count: number; totalDeficit: number; priority: number } } = {};

    const excludedTypes = [STRUCTURE_STORAGE];
    const allTypes = Object.keys(this.baseTransferPriority).filter(type => !excludedTypes.includes(type as any));

    const targets = CarryUtils.findAvailableStructures(
      this.creep,
      allTypes as any[],
      (structure) => CarryUtils.structureNeedsEnergy(structure)
    );

    for (const target of targets) {
      const type = target.structureType;
      const store = target as any;
      const deficit = store.store.getCapacity(RESOURCE_ENERGY) - store.store[RESOURCE_ENERGY];

      if (!needs[type]) {
        needs[type] = {
          count: 0,
          totalDeficit: 0,
          priority: this.baseTransferPriority[type] || 999
        };
      }

      needs[type].count++;
      needs[type].totalDeficit += deficit;
    }

    return needs;
  }

  /**
   * 检查是否应该优先补充某个特定类型的建筑
   * @param structureType 建筑类型
   * @returns 是否应该优先
   */
  private shouldPrioritizeStructure(structureType: string): boolean {
    if (structureType === STRUCTURE_TOWER) {
      const towers = this.creep.room.find(FIND_STRUCTURES, {
        filter: structure => structure.structureType === STRUCTURE_TOWER
      }) as StructureTower[];

      // 如果有Tower能量低于25%，优先补充
      for (const tower of towers) {
        const energyPercentage = CarryUtils.calculateEnergyPercentage(tower);
        if (energyPercentage < 25) {
          return true;
        }
      }
    }

    return false;
  }
}
