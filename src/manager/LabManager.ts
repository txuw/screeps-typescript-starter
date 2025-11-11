import { ConfigLoader } from "../config/ConfigLoader";
import { isReactable, getFirstReactionMaterials } from "../utils/ReactionUtils";

/**
 * Lab管理器Memory接口
 */
interface LabManagerMemory {
    lastReactionTime: { [labId: string]: number };
}

// 扩展全局Memory
declare global {
    interface Memory {
        labManager?: LabManagerMemory;
    }
}

/**
 * Lab管理器 - 负责房间内Lab网络的智能管理和反应控制
 */
export class LabManager {
    private static instance: LabManager;

    private constructor() {
        // 初始化Memory
        if (!Memory.labManager) {
            Memory.labManager = {
                lastReactionTime: {}
            };
        }
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): LabManager {
        if (!LabManager.instance) {
            LabManager.instance = new LabManager();
        }
        return LabManager.instance;
    }

    /**
     * 管理指定房间的Lab网络
     * @param roomName 房间名称
     */
    public manageRoomLabs(roomName: string): void {
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`[LabManager] Room ${roomName} not found or not visible`);
            return;
        }

        // 获取房间配置
        const configLoader = ConfigLoader.getInstance();
        const roomConfig = configLoader.getRoomConfig(roomName, room);

        // 检查Lab配置是否启用
        if (!roomConfig.labConfig || !roomConfig.labConfig.enabled) {
            return;
        }

        const labConfig = roomConfig.labConfig.labs;
        if (!labConfig || Object.keys(labConfig).length === 0) {
            return;
        }

        // 遍历配置中的每个Lab
        for (const labId in labConfig) {
            const product = labConfig[labId];

            // 检查该产物是否可以通过反应生成
            if (!isReactable(product)) {
                // 这是基础材料Lab，不需要反应
                continue;
            }

            // 获取生成该产物所需的材料
            const materials = getFirstReactionMaterials(product);
            if (!materials) {
                continue;
            }

            // 查找产物Lab
            const productLab = this.findLabById(room, labId);
            if (!productLab) {
                console.log(`[LabManager] Product lab ${labId} not found in room ${roomName}`);
                continue;
            }

            // 查找材料Lab
            const material1Lab = this.findLabByResource(room, labConfig, materials.material1);
            const material2Lab = this.findLabByResource(room, labConfig, materials.material2);

            if (!material1Lab || !material2Lab) {
                // console.log(`[LabManager] Material labs not found for ${product}: ${materials.material1}, ${materials.material2}`);
                continue;
            }

            // 检查是否可以进行反应
            if (this.canReact(productLab, material1Lab, material2Lab)) {
                const result = productLab.runReaction(material1Lab, material2Lab);
                if (result === OK) {
                    // console.log(`[LabManager] [${roomName}] ${product} reaction: ${materials.material1} + ${materials.material2} -> ${product}`);
                    Memory.labManager!.lastReactionTime[labId] = Game.time;
                } else if (result !== ERR_TIRED && result !== ERR_NOT_ENOUGH_RESOURCES) {
                    console.log(`[LabManager] [${roomName}] Reaction failed for ${product}: ${result}`);
                }
            }
        }
    }

    /**
     * 根据Lab ID查找Lab
     * @param room 房间对象
     * @param labId Lab的ID
     * @returns Lab对象或null
     */
    private findLabById(room: Room, labId: string): StructureLab | null {
        const lab = Game.getObjectById(labId as Id<StructureLab>);
        if (lab && lab.room.name === room.name) {
            return lab;
        }
        return null;
    }

    /**
     * 根据资源类型在配置中查找Lab
     * @param room 房间对象
     * @param labConfig Lab配置对象
     * @param resourceType 资源类型
     * @returns Lab对象或null
     */
    private findLabByResource(
        room: Room,
        labConfig: { [labId: string]: string },
        resourceType: string
    ): StructureLab | null {
        for (const labId in labConfig) {
            if (labConfig[labId] === resourceType) {
                const lab = this.findLabById(room, labId);
                if (lab) {
                    return lab;
                }
            }
        }
        return null;
    }

    /**
     * 检查Lab是否可以进行反应
     * @param productLab 产物Lab
     * @param material1Lab 材料1 Lab
     * @param material2Lab 材料2 Lab
     * @returns 是否可以反应
     */
    private canReact(
        productLab: StructureLab,
        material1Lab: StructureLab,
        material2Lab: StructureLab
    ): boolean {
        // 检查产物Lab是否在冷却中
        if (productLab.cooldown > 0) {
            return false;
        }

        // 检查材料Lab是否有足够的资源
        const material1Amount = material1Lab.store.getUsedCapacity(material1Lab.mineralType || RESOURCE_ENERGY) || 0;
        const material2Amount = material2Lab.store.getUsedCapacity(material2Lab.mineralType || RESOURCE_ENERGY) || 0;

        // 至少需要1单位的材料才能反应
        if (material1Amount < 1 || material2Amount < 1) {
            return false;
        }

        // 检查产物Lab是否还有空间
        const productMineralType = productLab.mineralType;
        if (productMineralType) {
            const productAmount = productLab.store.getUsedCapacity(productMineralType) || 0;
            const productCapacity = productLab.store.getCapacity(productMineralType) || LAB_MINERAL_CAPACITY;

            if (productAmount >= productCapacity) {
                return false;
            }
        }

        return true;
    }

    /**
     * 清理过期的反应时间记录
     */
    public cleanup(): void {
        if (!Memory.labManager) {
            return;
        }

        const currentTime = Game.time;
        const lastReactionTime = Memory.labManager.lastReactionTime;

        for (const labId in lastReactionTime) {
            // 清理10000 tick之前的记录
            if (currentTime - lastReactionTime[labId] > 10000) {
                delete lastReactionTime[labId];
            }
        }
    }
}

