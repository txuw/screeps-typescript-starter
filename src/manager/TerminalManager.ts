import { TerminalConfig } from '../types/RoomConfig';

interface TerminalSendRecord {
    [targetRoom: string]: {
        [resourceType: string]: number;
    };
}

interface TerminalMemory {
    [roomName: string]: TerminalSendRecord;
}

interface TerminalConfigIndex {
    [roomName: string]: number;
}

declare global {
    interface Memory {
        terminalSends?: TerminalMemory;
        terminalConfigIndex?: TerminalConfigIndex;
    }
}

export class TerminalManager {
    private static instance: TerminalManager;

    private constructor() {
        // 初始化Memory结构
        if (!Memory.terminalSends) {
            Memory.terminalSends = {};
        }
        if (!Memory.terminalConfigIndex) {
            Memory.terminalConfigIndex = {};
        }
    }

    public static getInstance(): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }

    /**
     * 处理指定房间的Terminal操作
     * @param room 房间对象
     * @param terminalConfig terminal配置数组
     */
    public processTerminal(room: Room, terminalConfig: TerminalConfig[]): void {
        // 每次都从Game.rooms获取最新的room对象，避免缓存问题
        const currentRoom = Game.rooms[room.name];
        if (!currentRoom || !currentRoom.terminal) {
            return;
        }

        let terminal = currentRoom.terminal;

        // 检查Terminal是否在冷却中，如果是则跳过处理
        if (terminal.cooldown > 0) {
            // 只有在冷却时间较短时才打印日志，避免刷屏
            if (terminal.cooldown <= 3) {
                console.log(`Terminal ${currentRoom.name} 冷却中，剩余 ${terminal.cooldown} tick`);
            }
            return;
        }

        if (terminal.store.getFreeCapacity() === 0) {
            console.log(`Terminal ${currentRoom.name} 已满，跳过处理`);
            return;
        }

        // 确保Memory结构存在
        if (!Memory.terminalSends) {
            Memory.terminalSends = {};
        }
        if (!Memory.terminalConfigIndex) {
            Memory.terminalConfigIndex = {};
        }

        // 初始化该房间的Memory记录
        if (!Memory.terminalSends[currentRoom.name]) {
            Memory.terminalSends[currentRoom.name] = {};
        }
        if (Memory.terminalConfigIndex[currentRoom.name] === undefined) {
            Memory.terminalConfigIndex[currentRoom.name] = 0;
        }

        // 如果没有配置，返回
        if (!terminalConfig || terminalConfig.length === 0) {
            return;
        }

        // 获取当前配置下标
        let currentIndex = Memory.terminalConfigIndex[currentRoom.name];

        // 确保下标在有效范围内
        if (currentIndex >= terminalConfig.length) {
            currentIndex = 0;
            Memory.terminalConfigIndex[currentRoom.name] = 0;
        }

        // 从当前下标开始遍历所有配置（轮换处理）
        let checkedCount = 0;
        const startIndex = currentIndex;

        console.log(`[TerminalManager] ${currentRoom.name} 从配置下标 ${currentIndex} 开始检查`);

        while (checkedCount < terminalConfig.length) {
            const config = terminalConfig[currentIndex];

            console.log(`[TerminalManager] 检查配置 ${currentIndex}: ${config.resourceType} -> ${config.targetRoom}`);

            if (this.shouldSendResource(currentRoom, config)) {
                this.sendResource(terminal, config);

                // 发送成功后，移动到下一个配置
                currentIndex = (currentIndex + 1) % terminalConfig.length;
                Memory.terminalConfigIndex[currentRoom.name] = currentIndex;
                console.log(`[TerminalManager] 发送成功，下次将从配置下标 ${currentIndex} 开始处理`);

                // Terminal每次只能发送一个资源，发送后退出
                return;
            }

            // 当前配置无法发送，移动到下一个配置继续检查
            currentIndex = (currentIndex + 1) % terminalConfig.length;
            checkedCount++;
        }

        // 如果遍历完所有配置都无法发送，移动到下一个配置，避免下次再卡在同一个位置
        // 使用起始位置 +1 作为下次的起点
        const nextIndex = (startIndex + 1) % terminalConfig.length;
        Memory.terminalConfigIndex[currentRoom.name] = nextIndex;
        console.log(`[TerminalManager] ${currentRoom.name} 所有配置都无法发送，下次将从配置下标 ${nextIndex} 开始`);
    }

    /**
     * 检查是否应该发送资源
     * @param room 房间对象
     * @param config terminal配置
     * @returns 是否应该发送
     */
    private shouldSendResource(room: Room, config: TerminalConfig): boolean {
        const targetRoom = config.targetRoom;
        const resourceType = config.resourceType;
        const maxCount = parseInt(config.count) || 10;

        // 检查是否已达到发送次数限制
        const currentCount = this.getSendCount(room.name, targetRoom, resourceType);
        if (currentCount >= maxCount) {
            console.log(`Terminal ${room.name} 发送 ${resourceType} 到 ${targetRoom} 已达到最大次数 ${maxCount}`);
            return false;
        }

        // 检查terminal是否有足够的资源
        const availableAmount = room.terminal?.store.getUsedCapacity(resourceType) || 0;
        const sendAmount = parseInt(config.amount) || 0;

        if (availableAmount < sendAmount) {
            console.log(`Terminal ${room.name} ${resourceType} 不足，需要 ${sendAmount}，可用 ${availableAmount}`);
            return false;
        }

        // 注意：不检查目标房间终端状态，因为对于非个人房间无法获取信息
        // 如果发送失败，terminal.send 会返回错误码

        return true;
    }

    /**
     * 发送资源
     * @param terminal terminal对象
     * @param config terminal配置
     */
    private sendResource(terminal: StructureTerminal, config: TerminalConfig): void {
        const resourceType = config.resourceType;
        const amount = parseInt(config.amount) || 0;
        const targetRoom = config.targetRoom;
        const description = config.desc || `发送 ${resourceType} 到 ${targetRoom}`;

        // 执行发送操作
        const result = terminal.send(resourceType, amount, targetRoom, description);

        if (result === OK) {
            // 增加发送计数
            this.incrementSendCount(terminal.room.name, targetRoom, resourceType);
            console.log(`Terminal ${terminal.room.name} 成功发送 ${amount} ${resourceType} 到 ${targetRoom}，描述：${description}`);
        } else {
            console.log(`Terminal ${terminal.room.name} 发送失败，错误码：${result}`);
        }
    }

    /**
     * 获取发送次数
     * @param roomName 房间名
     * @param targetRoom 目标房间名
     * @param resourceType 资源类型
     * @returns 发送次数
     */
    private getSendCount(roomName: string, targetRoom: string, resourceType: string): number {
        if (!Memory.terminalSends ||
            !Memory.terminalSends[roomName] ||
            !Memory.terminalSends[roomName][targetRoom] ||
            !Memory.terminalSends[roomName][targetRoom][resourceType]) {
            return 0;
        }
        return Memory.terminalSends[roomName][targetRoom][resourceType];
    }

    /**
     * 增加发送计数
     * @param roomName 房间名
     * @param targetRoom 目标房间名
     * @param resourceType 资源类型
     */
    private incrementSendCount(roomName: string, targetRoom: string, resourceType: string): void {
        if (!Memory.terminalSends) {
            Memory.terminalSends = {};
        }
        if (!Memory.terminalSends[roomName]) {
            Memory.terminalSends[roomName] = {};
        }
        if (!Memory.terminalSends[roomName][targetRoom]) {
            Memory.terminalSends[roomName][targetRoom] = {};
        }
        if (!Memory.terminalSends[roomName][targetRoom][resourceType]) {
            Memory.terminalSends[roomName][targetRoom][resourceType] = 0;
        }

        Memory.terminalSends[roomName][targetRoom][resourceType]++;
    }

    /**
     * 重置指定房间的发送计数
     * @param roomName 房间名
     * @param targetRoom 目标房间名（可选）
     * @param resourceType 资源类型（可选）
     */
    public resetSendCount(roomName: string, targetRoom?: string, resourceType?: string): void {
        if (!Memory.terminalSends || !Memory.terminalSends[roomName]) {
            return;
        }

        if (!targetRoom) {
            // 重置整个房间的计数
            delete Memory.terminalSends[roomName];
        } else if (!resourceType) {
            // 重置指定目标房间的计数
            delete Memory.terminalSends[roomName][targetRoom];
        } else {
            // 重置指定资源和目标房间的计数
            delete Memory.terminalSends[roomName][targetRoom][resourceType];
        }
    }

    /**
     * 获取Terminal统计信息
     * @param roomName 房间名
     * @returns 统计信息
     */
    public getTerminalStats(roomName: string): any {
        if (!Memory.terminalSends || !Memory.terminalSends[roomName]) {
            return {};
        }

        return Memory.terminalSends[roomName];
    }

    /**
     * 重置配置下标
     * @param roomName 房间名
     */
    public resetConfigIndex(roomName: string): void {
        if (!Memory.terminalConfigIndex) {
            Memory.terminalConfigIndex = {};
        }
        Memory.terminalConfigIndex[roomName] = 0;
        console.log(`[TerminalManager] ${roomName} 的配置下标已重置为 0`);
    }

    /**
     * 获取当前配置下标
     * @param roomName 房间名
     * @returns 配置下标
     */
    public getConfigIndex(roomName: string): number {
        if (!Memory.terminalConfigIndex || Memory.terminalConfigIndex[roomName] === undefined) {
            return 0;
        }
        return Memory.terminalConfigIndex[roomName];
    }
}
