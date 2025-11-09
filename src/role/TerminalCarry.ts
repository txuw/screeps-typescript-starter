import { CreepUtils } from '../utils/CreepUtils';
import { TerminalManager } from '../manager/TerminalManager';
import { RoomManager } from '../manager/RoomManager';

interface TerminalCarryMemory extends CreepMemory {
    targetResourceType?: ResourceConstant;
    targetAmount?: number;
    working: boolean;
    // 新增字段 - Terminal工作模式
    terminalMode: 'config_transfer' | 'cleanup' | 'energy_supplement' | 'empty_idle';
    lastTerminalCheck: number;
    targetCleanupResource?: ResourceConstant;
    // 能量补充相关
    energySupplementTarget?: number;
}

export class TerminalCarry {
    private creep: Creep;
    private memory: TerminalCarryMemory;
    private roomManager: RoomManager | null ;

    constructor(creep: Creep, roomManager?: RoomManager| null) {
        this.creep = creep;
        this.memory = creep.memory as TerminalCarryMemory;
        this.roomManager = roomManager || null;
        this.initializeMemory();
    }

    /**
     * 设置RoomManager引用
     */
    public setRoomManager(roomManager: RoomManager): void {
        this.roomManager = roomManager;
    }

    private initializeMemory(): void {
        if (this.memory.working === undefined) {
            this.memory.working = false;
        }
        if (this.memory.terminalMode === undefined) {
            this.memory.terminalMode = 'config_transfer';
        }
        if (this.memory.lastTerminalCheck === undefined) {
            this.memory.lastTerminalCheck = 0;
        }
    }

    /**
     * 主要工作方法
     */
    public work(): void {
        // 更新Terminal检查时间
        if (this.shouldCheckTerminal()) {
            this.memory.lastTerminalCheck = Game.time;
            this.manageTerminalResources();
        }

        // 根据当前模式执行相应操作
        switch (this.memory.terminalMode) {
            case 'config_transfer':
                this.handleConfigTransferMode();
                break;
            case 'cleanup':
                if (this.memory.working) {
                    this.completeCleanup();
                } else {
                    this.handleCleanup();
                }
                break;
            case 'energy_supplement':
                if (this.memory.working) {
                    this.completeEnergySupplement();
                } else {
                    this.handleEnergySupplement();
                }
                break;
            case 'empty_idle':
                if (this.memory.working) {
                    this.completeEmptyIdle();
                } else {
                    this.handleEmptyIdle();
                }
                break;
            default:
                // 默认模式，切换到配置传输
                this.memory.terminalMode = 'config_transfer';
                break;
        }
    }

    /**
     * 管理Terminal资源 - 决定工作模式
     */
    private manageTerminalResources(): void {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            // 没有Terminal，待机
            this.memory.terminalMode = 'config_transfer';
            return;
        }

        const isWorking = this.isTerminalWorking();
        const hasPendingSend = this.hasPendingSendOperations();
        const needsEnergy = this.needsEnergySupplement();
        const unconfiguredResources = this.getUnconfiguredResources();
        const shouldEmpty = this.shouldEmptyTerminal();

        // 优先级判断逻辑
        if (needsEnergy && hasPendingSend) {
            // 最高优先级：需要发送且能量不足
            this.memory.terminalMode = 'energy_supplement';
            console.log(`[${this.creep.name}] 切换到能量补充模式`);
        } else if (unconfiguredResources.length > 0 && isWorking) {
            // 次高优先级：Terminal工作时清理未配置资源
            this.memory.terminalMode = 'cleanup';
            console.log(`[${this.creep.name}] 切换到清理模式，目标: ${unconfiguredResources[0]}`);
        } else if (shouldEmpty) {
            // 普通优先级：Terminal空闲时清空
            this.memory.terminalMode = 'empty_idle';
            console.log(`[${this.creep.name}] 切换到空闲清空模式`);
        } else {
            // 默认模式：配置资源传输
            this.memory.terminalMode = 'config_transfer';
        }
    }

    /**
     * 处理配置传输模式
     */
    private handleConfigTransferMode(): void {
        // 检查是否有Terminal配置
        const terminalConfig = this.getTerminalConfig();
        if (!terminalConfig || terminalConfig.length === 0) {
            console.log(`[${this.creep.name}] 没有Terminal配置，待机`);
            this.wait();
            return;
        }

        // 获取需要搬运的资源配置
        const resourceConfig = this.getResourceToCarry(terminalConfig);
        if (!resourceConfig) {
            console.log(`[${this.creep.name}] 没有需要搬运的资源，待机`);
            this.wait();
            return;
        }

        this.memory.targetResourceType = resourceConfig.resourceType;
        this.memory.targetAmount = parseInt(resourceConfig.amount);

        // 检查是否应该继续工作
        if (!this.shouldContinueWork(resourceConfig)) {
            console.log(`[${this.creep.name}] 配置资源已达到目标数额或发送次数限制，待机`);
            this.wait();
            return;
        }

        // 状态机：空载去Storage，满载去Terminal
        if (this.memory.working) {
            // 满载状态，去Terminal
            this.workAtTerminal();
        } else {
            // 空载状态，去Storage
            this.collectFromStorage();
        }
    }

    /**
     * 获取Terminal配置
     */
    private getTerminalConfig(): any[] {
        const roomConfig = this.getRoomConfig();
        return roomConfig?.terminalConfig?.terminalConfigs || [];
    }

    /**
     * 获取房间配置
     */
    private getRoomConfig(): any {
        // 优先使用传入的RoomManager
        if (this.roomManager) {
            try {
                return this.roomManager.getConfig();
            } catch (error) {
                console.log(`[${this.creep.name}] 从RoomManager获取配置失败: ${error}`);
            }
        }

        // 如果没有RoomManager，返回默认空配置
        return { terminalConfig: { enabled: false, terminalConfigs: [] } };
    }

    /**
     * 获取需要搬运的资源配置
     */
    private getResourceToCarry(terminalConfig: any[]): any | null {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return null;
        }

        // 获取Terminal发送统计
        const terminalManager = TerminalManager.getInstance();
        const stats = terminalManager.getTerminalStats(this.creep.room.name);

        // 查找第一个需要补充的资源
        for (const config of terminalConfig) {
            const resourceType = config.resourceType;
            const targetAmount = parseInt(config.amount) || 0;
            const currentAmount = terminal.store.getUsedCapacity(resourceType) || 0;
            const targetRoom = config.targetRoom;
            const maxCount = parseInt(config.count) || 10;

            // 检查发送次数是否已满
            if (stats[targetRoom]?.[resourceType] >= maxCount) {
                console.log(`[${this.creep.name}] 跳过 ${resourceType}，发送次数已满: ${stats[targetRoom]?.[resourceType]}/${maxCount}`);
                continue; // 跳过这个配置，检查下一个
            }

            // 如果当前数量小于目标数量，需要补充
            if (currentAmount < targetAmount) {
                console.log(`[${this.creep.name}] 选择搬运 ${resourceType}，当前: ${currentAmount}/${targetAmount}`);
                return config;
            } else {
                console.log(`[${this.creep.name}] 跳过 ${resourceType}，已达到目标数额: ${currentAmount}/${targetAmount}`);
            }
        }

        console.log(`[${this.creep.name}] 没有找到需要搬运的资源配置`);
        return null;
    }

    /**
     * 检查是否应该继续工作
     */
    private shouldContinueWork(resourceConfig: any): boolean {
        // 检查Terminal是否存在
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return false;
        }

        const resourceType = resourceConfig.resourceType;
        const targetAmount = parseInt(resourceConfig.amount) || 0;
        const currentAmount = terminal.store.getUsedCapacity(resourceType) || 0;

        // 再次确认当前数量仍然小于目标数量（防止在搬运过程中数量发生变化）
        if (currentAmount >= targetAmount) {
            console.log(`[${this.creep.name}] ${resourceType} 已达到目标数额 ${targetAmount}，当前: ${currentAmount}`);
            return false;
        }

        return true;
    }

    /**
     * 从Storage收集资源
     */
    private collectFromStorage(): void {
        const storage = this.creep.room.storage;
        if (!storage) {
            console.log(`[${this.creep.name}] 房间没有Storage`);
            return;
        }

        const resourceType = this.memory.targetResourceType;
        if (!resourceType) {
            console.log(`[${this.creep.name}] 没有目标资源类型`);
            return;
        }

        // 检查Storage中是否有该资源
        const availableAmount = storage.store.getUsedCapacity(resourceType) || 0;
        if (availableAmount === 0) {
            console.log(`[${this.creep.name}] Storage中没有 ${resourceType}`);
            return;
        }

        // 移动到Storage旁边
        if (this.creep.pos.getRangeTo(storage) > 1) {
            this.creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // 检查是否已经满载
        if (this.creep.store.getFreeCapacity() === 0) {
            this.memory.working = true;
            return;
        }

        // 从Storage取出资源
        const freeCapacity = this.creep.store.getFreeCapacity();
        const withdrawAmount = Math.min(freeCapacity, availableAmount);

        // 确保withdrawAmount大于0
        if (withdrawAmount <= 0) {
            console.log(`[${this.creep.name}] 无效的配置传输取出数量: ${withdrawAmount}，可用容量: ${freeCapacity}，可用资源: ${availableAmount}`);
            return;
        }

        const result = this.creep.withdraw(storage, resourceType, withdrawAmount);
        if (result === OK) {
            console.log(`[${this.creep.name}] 从Storage取出 ${withdrawAmount} ${resourceType}`);
        } else {
            console.log(`[${this.creep.name}] 取出资源失败: ${result}`);
        }
    }

    /**
     * 在Terminal工作
     */
    private workAtTerminal(): void {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            console.log(`[${this.creep.name}] 房间没有Terminal`);
            return;
        }

        // 移动到Terminal旁边
        if (this.creep.pos.getRangeTo(terminal) > 1) {
            this.creep.moveTo(terminal, { visualizePathStyle: { stroke: '#00ffaa' } });
            return;
        }

        // 检查是否已经空载
        if (this.creep.store.getUsedCapacity() === 0) {
            this.memory.working = false;
            return;
        }

        // 向Terminal转移资源
        const resourceType = this.memory.targetResourceType;
        if (!resourceType) {
            console.log(`[${this.creep.name}] 没有目标资源类型`);
            return;
        }

        const carryAmount = this.creep.store.getUsedCapacity(resourceType) || 0;
        if (carryAmount === 0) {
            console.log(`[${this.creep.name}] 没有携带 ${resourceType}`);
            return;
        }

        // 检查Terminal是否有足够空间
        const freeSpace = terminal.store.getFreeCapacity(resourceType);
        if (freeSpace < carryAmount) {
            console.log(`[${this.creep.name}] Terminal空间不足，需要 ${carryAmount}，可用 ${freeSpace}`);
            return;
        }

        const result = this.creep.transfer(terminal, resourceType);
        if (result === OK) {
            console.log(`[${this.creep.name}] 向Terminal转移 ${carryAmount} ${resourceType}`);

            // 如果转移完成，切换到收集状态
            if (this.creep.store.getUsedCapacity() === 0) {
                this.memory.working = false;
            }
        } else {
            console.log(`[${this.creep.name}] 转移资源失败: ${result}`);
        }
    }

    /**
     * 等待/待机
     */
    private wait(): void {
        // 寻找等待位置
        const flag = Game.flags[this.creep.memory.homeRoom + '.Wait'];
        if (flag) {
            this.creep.moveTo(flag, { visualizePathStyle: { stroke: '#ffffff' } });
        } else {
            // 在房间的中心位置等待
            const centerPos = new RoomPosition(25, 25, this.creep.room.name);
            this.creep.moveTo(centerPos, { visualizePathStyle: { stroke: '#ffffff' } });
        }
    }

    /**
     * 检测Terminal是否正在工作
     */
    private isTerminalWorking(): boolean {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return false;
        }
        const cooldown = terminal.cooldown;
        return cooldown !== undefined && cooldown > 0;
    }

    /**
     * 检测是否有待处理的发送操作
     */
    private hasPendingSendOperations(): boolean {
        const terminalConfig = this.getTerminalConfig();
        if (!terminalConfig || terminalConfig.length === 0) {
            return false;
        }

        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return false;
        }

        // 检查是否有配置的资源需要发送
        for (const config of terminalConfig) {
            const resourceType = config.resourceType;
            const targetAmount = parseInt(config.amount) || 0;
            const currentAmount = terminal.store.getUsedCapacity(resourceType) || 0;

            // 如果当前数量达到目标数量，说明可能准备发送
            if (currentAmount >= targetAmount) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检测是否应该检查Terminal状态（避免频繁检查）
     */
    private shouldCheckTerminal(): boolean {
        return Game.time - this.memory.lastTerminalCheck > 5; // 每5tick检查一次
    }

    /**
     * 获取未在配置中标识的矿物资源
     */
    private getUnconfiguredResources(): ResourceConstant[] {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return [];
        }

        const terminalConfig = this.getTerminalConfig();
        if (!terminalConfig || terminalConfig.length === 0) {
            return [];
        }

        // 获取所有配置的资源类型
        const configuredResources = new Set<ResourceConstant>();
        for (const config of terminalConfig) {
            configuredResources.add(config.resourceType);
        }

        // 扫描Terminal中的所有资源，找出未配置的矿物（排除能量）
        const unconfiguredResources: ResourceConstant[] = [];
        for (const resourceType in terminal.store) {
            const resource = resourceType as ResourceConstant;
            const amount = terminal.store.getUsedCapacity(resource) || 0;

            // 跳过能量和配置的资源，只处理未配置的矿物
            if (resource !== RESOURCE_ENERGY &&
                amount > 0 &&
                !configuredResources.has(resource)) {
                unconfiguredResources.push(resource);
            }
        }

        // 按数量排序，优先处理数量多的资源
        unconfiguredResources.sort((a, b) => {
            const amountA = terminal.store.getUsedCapacity(a) || 0;
            const amountB = terminal.store.getUsedCapacity(b) || 0;
            return amountB - amountA;
        });

        return unconfiguredResources;
    }

    /**
     * 处理未配置资源的清理
     */
    private handleCleanup(): void {
        const terminal = this.creep.room.terminal;
        const storage = this.creep.room.storage;

        if (!terminal || !storage) {
            console.log(`[${this.creep.name}] 缺少Terminal或Storage`);
            return;
        }

        // 如果没有指定清理资源，重新选择
        if (!this.memory.targetCleanupResource) {
            const unconfiguredResources = this.getUnconfiguredResources();
            if (unconfiguredResources.length === 0) {
                // 没有需要清理的资源，切换回配置传输模式
                this.memory.terminalMode = 'config_transfer';
                return;
            }
            this.memory.targetCleanupResource = unconfiguredResources[0];
        }

        const targetResource = this.memory.targetCleanupResource;
        const availableAmount = terminal.store.getUsedCapacity(targetResource) || 0;

        if (availableAmount === 0) {
            // 资源已清理完成，选择下一个或切换模式
            this.memory.targetCleanupResource = undefined;
            return;
        }

        // 移动到Terminal旁边
        if (this.creep.pos.getRangeTo(terminal) > 1) {
            this.creep.moveTo(terminal, { visualizePathStyle: { stroke: '#ff6600' } });
            return;
        }

        // 从Terminal取出资源
        const freeCapacity = this.creep.store.getFreeCapacity();

        // 如果creep已满，先去Storage卸货
        if (freeCapacity === 0) {
            console.log(`[${this.creep.name}] Creep已满，先去Storage卸货`);
            this.completeCleanup(); // 直接执行卸货
            return;
        }

        const withdrawAmount = Math.min(freeCapacity, availableAmount);

        // 确保withdrawAmount大于0
        if (withdrawAmount <= 0) {
            console.log(`[${this.creep.name}] 无效的取出数量: ${withdrawAmount}，可用容量: ${freeCapacity}，可用资源: ${availableAmount}`);
            return;
        }

        const result = this.creep.withdraw(terminal, targetResource, withdrawAmount);
        if (result === OK) {
            console.log(`[${this.creep.name}] 从Terminal取出 ${withdrawAmount} ${targetResource}`);
            this.memory.working = true; // 切换到搬运状态
        } else {
            console.log(`[${this.creep.name}] 从Terminal取出资源失败: ${result}`);
        }
    }

    /**
     * 完成清理 - 将资源存入Storage
     */
    private completeCleanup(): void {
        const storage = this.creep.room.storage;
        if (!storage) {
            return;
        }

        // 移动到Storage旁边
        if (this.creep.pos.getRangeTo(storage) > 1) {
            this.creep.moveTo(storage, { visualizePathStyle: { stroke: '#ff6600' } });
            return;
        }

        const targetResource = this.memory.targetCleanupResource;
        if (!targetResource) {
            this.memory.working = false;
            return;
        }

        const carryAmount = this.creep.store.getUsedCapacity(targetResource) || 0;
        if (carryAmount === 0) {
            this.memory.working = false;
            return;
        }

        // 存入Storage
        const result = this.creep.transfer(storage, targetResource);
        if (result === OK) {
            console.log(`[${this.creep.name}] 将 ${carryAmount} ${targetResource} 存入Storage`);

            // 如果搬运完成，检查是否还有需要清理的资源
            if (this.creep.store.getUsedCapacity() === 0) {
                this.memory.working = false;
                this.memory.targetCleanupResource = undefined;
            }
        } else {
            console.log(`[${this.creep.name}] 存入Storage失败: ${result}`);
        }
    }

    /**
     * 计算发送资源所需的能量成本
     */
    private calculateEnergyCost(): number {
        const terminalConfig = this.getTerminalConfig();
        if (!terminalConfig || terminalConfig.length === 0) {
            return 0;
        }

        let totalEnergyCost = 0;
        const currentRoom = this.creep.room.name;

        for (const config of terminalConfig) {
            const targetRoom = config.targetRoom;
            const amount = parseInt(config.amount) || 0;

            if (targetRoom && amount > 0) {
                try {
                    const cost = Game.market.calcTransactionCost(amount, currentRoom, targetRoom);
                    totalEnergyCost += cost;
                } catch (error) {
                    console.log(`[${this.creep.name}] 计算能量成本失败: ${error}`);
                }
            }
        }

        return totalEnergyCost;
    }

    /**
     * 检查Terminal是否需要补充能量
     */
    private needsEnergySupplement(): boolean {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return false;
        }

        const currentEnergy = terminal.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
        const requiredEnergy = this.calculateEnergyCost();

        // 如果Terminal中的能量少于所需能量，需要补充
        return currentEnergy < requiredEnergy && requiredEnergy > 0;
    }

    /**
     * 处理能量补充
     */
    private handleEnergySupplement(): void {
        const terminal = this.creep.room.terminal;
        const storage = this.creep.room.storage;

        if (!terminal || !storage) {
            console.log(`[${this.creep.name}] 缺少Terminal或Storage`);
            return;
        }

        // 计算需要的能量数量
        const requiredEnergy = this.calculateEnergyCost();
        if (requiredEnergy === 0) {
            // 不需要能量，切换模式
            this.memory.terminalMode = 'config_transfer';
            return;
        }

        const currentEnergy = terminal.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
        const energyNeeded = requiredEnergy - currentEnergy;

        if (energyNeeded <= 0) {
            // 能量已充足，切换模式
            this.memory.terminalMode = 'config_transfer';
            return;
        }

        // 检查Storage是否有足够能量
        const availableEnergy = storage.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
        if (availableEnergy === 0) {
            console.log(`[${this.creep.name}] Storage中没有能量`);
            return;
        }

        // 移动到Storage旁边
        if (this.creep.pos.getRangeTo(storage) > 1) {
            this.creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffff00' } });
            return;
        }

        // 从Storage取出能量
        const freeCapacity = this.creep.store.getFreeCapacity();

        // 如果creep已满，先去Terminal卸货
        if (freeCapacity === 0) {
            console.log(`[${this.creep.name}] Creep已满，先去Terminal卸货能量`);
            this.completeEnergySupplement(); // 直接执行卸货
            return;
        }

        const withdrawAmount = Math.min(freeCapacity, availableEnergy, energyNeeded);

        // 确保withdrawAmount大于0
        if (withdrawAmount <= 0) {
            console.log(`[${this.creep.name}] 无效的能量取出数量: ${withdrawAmount}，可用容量: ${freeCapacity}，可用能量: ${availableEnergy}，需要能量: ${energyNeeded}`);
            return;
        }

        const result = this.creep.withdraw(storage, RESOURCE_ENERGY, withdrawAmount);
        if (result === OK) {
            console.log(`[${this.creep.name}] 从Storage取出 ${withdrawAmount} 能量`);
            this.memory.working = true;
            this.memory.energySupplementTarget = withdrawAmount;
        } else {
            console.log(`[${this.creep.name}] 从Storage取出能量失败: ${result}`);
        }
    }

    /**
     * 完成能量补充 - 将能量存入Terminal
     */
    private completeEnergySupplement(): void {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return;
        }

        // 移动到Terminal旁边
        if (this.creep.pos.getRangeTo(terminal) > 1) {
            this.creep.moveTo(terminal, { visualizePathStyle: { stroke: '#ffff00' } });
            return;
        }

        const carryEnergy = this.creep.store.getUsedCapacity(RESOURCE_ENERGY) || 0;
        if (carryEnergy === 0) {
            this.memory.working = false;
            return;
        }

        // 检查Terminal是否还有空间
        const freeSpace = terminal.store.getFreeCapacity(RESOURCE_ENERGY);
        if (freeSpace < carryEnergy) {
            console.log(`[${this.creep.name}] Terminal能量空间不足`);
            return;
        }

        // 存入Terminal
        const result = this.creep.transfer(terminal, RESOURCE_ENERGY);
        if (result === OK) {
            console.log(`[${this.creep.name}] 将 ${carryEnergy} 能量存入Terminal`);

            // 如果搬运完成，检查是否还需要更多能量
            if (this.creep.store.getUsedCapacity() === 0) {
                this.memory.working = false;
                this.memory.energySupplementTarget = undefined;

                // 检查是否还需要补充能量
                if (this.needsEnergySupplement()) {
                    // 继续补充能量
                    // 保持当前模式
                } else {
                    // 能量补充完成，切换模式
                    this.memory.terminalMode = 'config_transfer';
                }
            }
        } else {
            console.log(`[${this.creep.name}] 存入Terminal能量失败: ${result}`);
        }
    }

    /**
     * 检查Terminal是否空闲且需要清空
     */
    private shouldEmptyTerminal(): boolean {
        const terminal = this.creep.room.terminal;
        if (!terminal) {
            return false;
        }

        // 检查Terminal是否空闲（无冷却时间）
        if (terminal.cooldown > 0) {
            return false;
        }

        // 检查是否有待发送的操作
        if (this.hasPendingSendOperations()) {
            return false;
        }

        // 获取Terminal配置，检查哪些资源应该保留
        const terminalConfig = this.getTerminalConfig();
        if (!terminalConfig || terminalConfig.length === 0) {
            // 如果没有配置，清空所有资源
            const totalResources = terminal.store.getUsedCapacity();
            return totalResources > 0;
        }

        // 获取配置的资源类型
        const configuredResources = new Set<ResourceConstant>();
        for (const config of terminalConfig) {
            configuredResources.add(config.resourceType);
        }

        // 检查Terminal中是否有未配置的资源需要清空
        const unconfiguredFound: {resource: ResourceConstant, amount: number}[] = [];
        for (const resourceType in terminal.store) {
            const resource = resourceType as ResourceConstant;
            const amount = terminal.store.getUsedCapacity(resource) || 0;

            // 跳过配置的资源，只检查未配置的资源
            if (amount > 0 && !configuredResources.has(resource)) {
                unconfiguredFound.push({resource, amount});
            }
        }

        if (unconfiguredFound.length > 0) {
            console.log(`[${this.creep.name}] 检测到未配置资源需要清空: ${unconfiguredFound.map(r => `${r.resource}(${r.amount})`).join(', ')}`);
            return true;
        }

        // 没有未配置资源需要清空
        return false;
    }

    /**
     * 处理Terminal空闲清空 - 只清空未配置的资源
     */
    private handleEmptyIdle(): void {
        const terminal = this.creep.room.terminal;
        const storage = this.creep.room.storage;

        if (!terminal || !storage) {
            console.log(`[${this.creep.name}] 缺少Terminal或Storage`);
            return;
        }

        // 检查是否需要清空
        if (!this.shouldEmptyTerminal()) {
            // 不需要清空，切换回配置传输模式
            this.memory.terminalMode = 'config_transfer';
            return;
        }

        // 获取配置的资源类型，避免清空配置的资源
        const terminalConfig = this.getTerminalConfig();
        const configuredResources = new Set<ResourceConstant>();
        if (terminalConfig) {
            for (const config of terminalConfig) {
                configuredResources.add(config.resourceType);
            }
        }

        // 找到Terminal中数量最多的未配置资源
        let targetResource: ResourceConstant | undefined;
        let maxAmount = 0;

        for (const resourceType in terminal.store) {
            const resource = resourceType as ResourceConstant;
            const amount = terminal.store.getUsedCapacity(resource) || 0;

            // 只考虑未配置的资源
            if (amount > maxAmount && !configuredResources.has(resource)) {
                maxAmount = amount;
                targetResource = resource;
            }
        }

        if (!targetResource || maxAmount === 0) {
            // 没有未配置资源，切换模式
            this.memory.terminalMode = 'config_transfer';
            return;
        }

        // 移动到Terminal旁边
        if (this.creep.pos.getRangeTo(terminal) > 1) {
            this.creep.moveTo(terminal, { visualizePathStyle: { stroke: '#00ffff' } });
            return;
        }

        // 从Terminal取出资源
        const freeCapacity = this.creep.store.getFreeCapacity();

        // 如果creep已满，先去Storage卸货
        if (freeCapacity === 0) {
            console.log(`[${this.creep.name}] Creep已满，先去Storage卸货`);
            this.completeEmptyIdle(); // 直接执行卸货
            return;
        }

        const withdrawAmount = Math.min(freeCapacity, maxAmount);

        // 确保withdrawAmount大于0
        if (withdrawAmount <= 0) {
            console.log(`[${this.creep.name}] 无效的清空取出数量: ${withdrawAmount}，可用容量: ${freeCapacity}，可用资源: ${maxAmount}`);
            return;
        }

        const result = this.creep.withdraw(terminal, targetResource, withdrawAmount);
        if (result === OK) {
            console.log(`[${this.creep.name}] 从Terminal取出 ${withdrawAmount} ${targetResource} (空闲清空)`);
            this.memory.working = true;
            this.memory.targetCleanupResource = targetResource; // 复用这个字段
        } else {
            console.log(`[${this.creep.name}] 从Terminal取出资源失败: ${result}`);
        }
    }

    /**
     * 完成空闲清空 - 将资源存入Storage
     */
    private completeEmptyIdle(): void {
        const storage = this.creep.room.storage;
        if (!storage) {
            return;
        }

        // 移动到Storage旁边
        if (this.creep.pos.getRangeTo(storage) > 1) {
            this.creep.moveTo(storage, { visualizePathStyle: { stroke: '#00ffff' } });
            return;
        }

        const targetResource = this.memory.targetCleanupResource;
        if (!targetResource) {
            this.memory.working = false;
            return;
        }

        const carryAmount = this.creep.store.getUsedCapacity(targetResource) || 0;
        if (carryAmount === 0) {
            this.memory.working = false;
            return;
        }

        // 存入Storage
        const result = this.creep.transfer(storage, targetResource);
        if (result === OK) {
            console.log(`[${this.creep.name}] 将 ${carryAmount} ${targetResource} 存入Storage (空闲清空)`);

            // 如果搬运完成，检查是否还需要继续清空
            if (this.creep.store.getUsedCapacity() === 0) {
                this.memory.working = false;

                // 延迟检查，避免状态重复
                this.memory.lastTerminalCheck = Game.time;

                // 重新获取未配置资源列表，检查是否还有需要清空的
                const unconfiguredResources = this.getUnconfiguredResources();
                if (unconfiguredResources.length > 0) {
                    console.log(`[${this.creep.name}] 还有未配置资源需要清空: ${unconfiguredResources.join(', ')}`);
                    // 继续清空，保持当前模式
                    this.memory.targetCleanupResource = undefined; // 重新选择资源
                } else {
                    console.log(`[${this.creep.name}] 未配置资源清空完成，切换回配置传输模式`);
                    // 清空完成，切换模式
                    this.memory.terminalMode = 'config_transfer';
                    this.memory.targetCleanupResource = undefined;
                }
            }
        } else {
            console.log(`[${this.creep.name}] 存入Storage失败: ${result}`);
        }
    }

    /**
     * 生成TerminalCarry身体配置
     */
    public static generateTerminalCarryBody(): BodyPartConstant[] {
        return [
            MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
            CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY
        ];
    }
}
