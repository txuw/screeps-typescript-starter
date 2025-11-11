import { CarryUtils } from "../utils/CarryUtils";
import { ConfigLoader } from "../config/ConfigLoader";
import { isReactable } from "../utils/ReactionUtils";

/**
 * Lab配置项（用于排序）
 */
interface LabConfigItem {
    labId: string;
    resourceType: string;
    priority: number; // 0=基础资源, 1=中间产物, 2=最终产物
}

/**
 * LabCarry Memory扩展
 */
interface LabCarryMemory extends CreepMemory {
    labConfig?: {
        sortedConfig: LabConfigItem[];
        cacheTime: number;
    };
}

/**
 * Lab搬运者 - 负责Lab和Storage之间的资源搬运
 */
export class LabCarry {
    creep: Creep;
    memory: LabCarryMemory;

    constructor(creep: Creep) {
        this.creep = creep;
        this.memory = creep.memory as LabCarryMemory;
    }

    /**
     * 主工作函数
     */
    transport(): void {
        // 获取并排序Lab配置
        const sortedConfig = this.getSortedLabConfig();
        if (!sortedConfig || sortedConfig.length === 0) {
            // 没有Lab配置，等待
            CarryUtils.smartWaiting(
                this.creep,
                true,
                '⚠️ no config',
                `LabCarry ${this.creep.name} has no lab configuration`
            );
            return;
        }

        // 检查工作状态
        const isWorking = CarryUtils.checkWorkingState(this.creep, '🔄 from Lab/Storage', '📦 to Lab');

        if (isWorking) {
            this.performTransfer(sortedConfig);
        } else {
            this.performWithdraw(sortedConfig);
        }
    }

    /**
     * 执行转移操作（将资源放入Lab）
     */
    private performTransfer(sortedConfig: LabConfigItem[]): void {
        // 检查身上携带的资源
        const carriedResource = this.getCarriedResource();
        if (!carriedResource) {
            // 没有携带资源，切换状态
            this.creep.memory.working = false;
            return;
        }

        // 查找需要该资源的Lab
        const targetLab = this.findLabNeedsResource(sortedConfig, carriedResource);
        if (!targetLab) {
            // 找不到需要该资源的Lab，放回Storage
            const storage = this.creep.room.storage;
            if (storage) {
                CarryUtils.moveToAndTransfer(this.creep, storage, carriedResource, { stroke: '#ffffff' });
            } else {
                CarryUtils.smartWaiting(
                    this.creep,
                    true,
                    '⚠️ no storage',
                    `LabCarry ${this.creep.name} cannot find storage`
                );
            }
            return;
        }

        // 检查Lab容量
        const percent = this.getResourceCapacityPercent(targetLab, carriedResource);
        if (percent >= 60) {
            // Lab容量已达到60%，等待或切换状态
            CarryUtils.smartWaiting(
                this.creep,
                false,
                '⚠️ lab full',
                `LabCarry ${this.creep.name} waiting, lab ${targetLab.id} is ${percent.toFixed(1)}% full`
            );
            return;
        }

        // 将资源转移到Lab
        CarryUtils.moveToAndTransfer(this.creep, targetLab, carriedResource, { stroke: '#00ff00' });
    }

    /**
     * 执行提取操作（从Lab或Storage获取资源）
     */
    private performWithdraw(sortedConfig: LabConfigItem[]): void {
        // 优先检查是否有需要清理的Lab（非配置资源或容量>=95%）
        const labToCleanup = this.findLabWithWrongOrFullResource(sortedConfig);
        if (labToCleanup) {
            // 找到需要清理的Lab，提取资源
            const resourceType = labToCleanup.mineralType;
            if (resourceType) {
                CarryUtils.moveToAndWithdraw(this.creep, labToCleanup, resourceType, { stroke: '#ff0000' });
                return;
            }
        }

        // 没有需要清理的Lab，从Storage获取需要的资源
        const storage = this.creep.room.storage;
        if (!storage) {
            CarryUtils.smartWaiting(
                this.creep,
                true,
                '⚠️ no storage',
                `LabCarry ${this.creep.name} cannot find storage`
            );
            return;
        }

        // 查找需要补充资源的Lab（已排序，优先基础资源）
        const labNeedsResource = this.findLabNeedsResupply(sortedConfig);
        if (!labNeedsResource) {
            // 所有Lab都满了，等待
            CarryUtils.smartWaiting(
                this.creep,
                false,
                '💤 all labs ok',
                `LabCarry ${this.creep.name} all labs are ok`
            );
            return;
        }

        const resourceType = labNeedsResource.resourceType as ResourceConstant;
        const storageAmount = storage.store.getUsedCapacity(resourceType) || 0;

        if (storageAmount === 0) {
            // Storage中没有所需资源，等待
            CarryUtils.smartWaiting(
                this.creep,
                true,
                '⚠️ no resource',
                `LabCarry ${this.creep.name} waiting, storage has no ${resourceType}`
            );
            return;
        }

        // 从Storage提取资源
        CarryUtils.moveToAndWithdraw(this.creep, storage, resourceType, { stroke: '#ffaa00' });
    }

    /**
     * 获取并排序Lab配置（基础资源优先）
     * 使用Memory缓存避免频繁排序
     */
    private getSortedLabConfig(): LabConfigItem[] | null {
        // 检查Memory中的缓存，每50 tick更新一次
        if (this.memory.labConfig && Game.time - this.memory.labConfig.cacheTime < 50) {
            return this.memory.labConfig.sortedConfig;
        }

        const configLoader = ConfigLoader.getInstance();
        const roomConfig = configLoader.getRoomConfig(this.creep.room.name, this.creep.room);

        if (!roomConfig.labConfig || !roomConfig.labConfig.enabled) {
            return null;
        }

        const labConfig = roomConfig.labConfig.labs;
        if (!labConfig || Object.keys(labConfig).length === 0) {
            return null;
        }

        // 将配置转换为数组并排序
        const configItems: LabConfigItem[] = [];
        for (const labId in labConfig) {
            const resourceType = labConfig[labId];
            const priority = this.getResourcePriority(resourceType);
            configItems.push({
                labId,
                resourceType,
                priority
            });
        }

        // 按优先级排序（数字越小优先级越高）
        configItems.sort((a, b) => a.priority - b.priority);

        // 缓存结果到Memory
        this.memory.labConfig = {
            sortedConfig: configItems,
            cacheTime: Game.time
        };

        return configItems;
    }

    /**
     * 获取资源优先级
     * 0 = 基础资源（不可反应）
     * 1 = 可反应资源
     */
    private getResourcePriority(resourceType: string): number {
        return isReactable(resourceType) ? 1 : 0;
    }

    /**
     * 获取creep身上携带的资源类型
     */
    private getCarriedResource(): ResourceConstant | null {
        for (const resourceType in this.creep.store) {
            const resource = resourceType as ResourceConstant;
            const amount = this.creep.store.getUsedCapacity(resource) || 0;
            if (amount > 0) {
                return resource;
            }
        }
        return null;
    }

    /**
     * 查找需要指定资源的Lab
     */
    private findLabNeedsResource(
        sortedConfig: LabConfigItem[],
        resourceType: ResourceConstant
    ): StructureLab | null {
        for (const config of sortedConfig) {
            if (config.resourceType === resourceType) {
                const lab = Game.getObjectById(config.labId as Id<StructureLab>);
                if (lab && lab.room.name === this.creep.room.name) {
                    // 检查Lab容量
                    const percent = this.getResourceCapacityPercent(lab, resourceType);
                    if (percent < 60) {
                        return lab;
                    }
                }
            }
        }
        return null;
    }

    /**
     * 查找有错误资源或容量>=95%的Lab
     */
    private findLabWithWrongOrFullResource(sortedConfig: LabConfigItem[]): StructureLab | null {
        for (const config of sortedConfig) {
            const lab = Game.getObjectById(config.labId as Id<StructureLab>);
            if (!lab || lab.room.name !== this.creep.room.name) {
                continue;
            }

            const labMineralType = lab.mineralType;
            if (!labMineralType) {
                continue;
            }

            // 检查是否是错误的资源
            if (labMineralType !== config.resourceType) {
                return lab;
            }

            // 检查容量是否>=95%
            const percent = this.getResourceCapacityPercent(lab, labMineralType);
            if (percent >= 95) {
                return lab;
            }
        }
        return null;
    }

    /**
     * 查找需要补充资源的Lab（容量<60%）
     * 按优先级顺序查找（基础资源优先）
     */
    private findLabNeedsResupply(
        sortedConfig: LabConfigItem[]
    ): { lab: StructureLab; resourceType: string } | null {
        // 遍历已排序的配置（基础资源在前）
        for (const config of sortedConfig) {
            const lab = Game.getObjectById(config.labId as Id<StructureLab>);
            if (!lab || lab.room.name !== this.creep.room.name) {
                continue;
            }

            const labMineralType = lab.mineralType;
            // 如果Lab为空或资源类型匹配
            if (!labMineralType || labMineralType === config.resourceType) {
                const percent = this.getResourceCapacityPercent(lab, config.resourceType as ResourceConstant);
                if (percent < 60) {
                    return { lab, resourceType: config.resourceType };
                }
            }
        }
        return null;
    }

    /**
     * 获取Lab中指定资源的容量百分比
     */
    private getResourceCapacityPercent(lab: StructureLab, resourceType: ResourceConstant): number {
        const amount = lab.store.getUsedCapacity(resourceType) || 0;
        const capacity = lab.store.getCapacity(resourceType) || LAB_MINERAL_CAPACITY;
        return (amount / capacity) * 100;
    }
}

