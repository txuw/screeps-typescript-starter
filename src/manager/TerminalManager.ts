import { TerminalConfig } from '../types/RoomConfig';

interface TerminalSendRecord {
    [targetRoom: string]: {
        [resourceType: string]: number;
    };
}

interface TerminalMemory {
    [roomName: string]: TerminalSendRecord;
}

declare global {
    interface Memory {
        terminalSends?: TerminalMemory;
    }
}

export class TerminalManager {
    private static instance: TerminalManager;

    private constructor() {
        // 初始化Memory结构
        if (!Memory.terminalSends) {
            Memory.terminalSends = {};
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

        // 初始化该房间的Memory记录
        if (!Memory.terminalSends[currentRoom.name]) {
            Memory.terminalSends[currentRoom.name] = {};
        }

        for (const config of terminalConfig) {
            if (this.shouldSendResource(currentRoom, config)) {
                this.sendResource(terminal, config);
            }
        }
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
        // console.log(room.terminal)
        // console.log(room.terminal?.store)
        // console.log(room.terminal?.store.getUsedCapacity(resourceType))
        // 检查terminal是否有足够的资源
        const availableAmount = room.terminal?.store.getUsedCapacity(resourceType) || 0;
        const sendAmount = parseInt(config.amount) || 0;

        if (availableAmount < sendAmount) {
            console.log(`Terminal ${room.name} ${resourceType} 不足，需要 ${sendAmount}，可用 ${availableAmount}`);
            return false;
        }

        // 检查targetRoom是否存在terminal
        const targetRoomObj = Game.rooms[targetRoom];
        if (!targetRoomObj || !targetRoomObj.terminal) {
            console.log(`目标房间 ${targetRoom} 没有Terminal`);
            return false;
        }

        // 检查目标terminal是否有足够空间
        const targetFreeSpace = targetRoomObj.terminal.store.getFreeCapacity(resourceType);
        if (targetFreeSpace < sendAmount) {
            console.log(`目标房间 ${targetRoom} Terminal空间不足，需要 ${sendAmount}，可用 ${targetFreeSpace}`);
            return false;
        }

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
}
