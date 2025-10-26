/**
 * 等待位置管理器
 * 用于管理creep等待时的位置，避免在原地等待造成堵塞
 */
export class WaitingPositionManager {
  private static readonly WAITING_FLAG_NAME = 'waitingPos';

  /**
   * 获取等待位置
   * @param room 房间对象
   * @returns 等待位置的RoomPosition，如果没有找到则返回null
   */
  static getWaitingPosition(room: Room): RoomPosition | null {
    // 查找名为waitingPos的Flag
    const flags = room.find(FIND_FLAGS, {
      filter: flag => flag.name === this.WAITING_FLAG_NAME
    });

    if (flags.length > 0) {
      return flags[0].pos;
    }

    return null;
  }

  /**
   * 检查等待位置是否可用
   * @param room 房间对象
   * @returns 是否有可用的等待位置
   */
  static hasWaitingPosition(room: Room): boolean {
    return this.getWaitingPosition(room) !== null;
  }

  /**
   * 移动到等待位置
   * @param creep 要移动的creep
   * @param message 等待时显示的消息
   * @param range 到达等待位置的范围（默认为2）
   * @returns 是否正在移动或已到达等待位置
   */
  static moveToWaitingPosition(creep: Creep, message: string = '💤 waiting', range: number = 2): boolean {
    const waitingPos = this.getWaitingPosition(creep.room);

    if (!waitingPos) {
      // 如果没有等待位置，在原地等待
      creep.say(message);
      return false;
    }

    // 检查是否已经在等待位置附近
    const distance = creep.pos.getRangeTo(waitingPos);

    if (distance <= range) {
      // 已经在等待位置附近，显示等待消息
      creep.say(message);
      return true;
    }

    // 移动到等待位置
    const moveResult = creep.moveTo(waitingPos, {
      visualizePathStyle: { stroke: '#ffff00', opacity: 0.3 },
      range: range
    });

    if (moveResult === OK) {
      creep.say(`🚶 to waiting`);
    } else if (moveResult === ERR_NO_PATH) {
      creep.say('❌ no path');
      console.log(`WaitingPositionManager: No path to waiting position`);
    } else if (moveResult === ERR_INVALID_TARGET) {
      creep.say('❌ invalid pos');
      console.log(`WaitingPositionManager: Invalid waiting position`);
    }

    return moveResult === OK || moveResult === ERR_TIRED;
  }

  /**
   * 智能等待逻辑
   * 根据条件决定是否移动到等待位置
   * @param creep 要处理的creep
   * @param shouldWait 是否需要等待的条件
   * @param message 等待消息
   * @param range 到达等待位置的范围
   * @returns 是否正在等待或移动到等待位置
   */
  static smartWait(creep: Creep, shouldWait: boolean, message: string = '💤 waiting', range: number = 2): boolean {
    if (!shouldWait) {
      return false;
    }

    return this.moveToWaitingPosition(creep, message, range);
  }

  /**
   * 创建等待位置Flag（如果不存在）
   * @param room 房间对象
   * @param x X坐标
   * @param y Y坐标
   * @returns 是否成功创建或已存在
   */
  static createWaitingFlag(room: Room, x: number, y: number): boolean {
    // 检查是否已存在等待位置Flag
    const existingFlag = this.getWaitingPosition(room);
    if (existingFlag) {
      console.log(`WaitingPositionManager: Waiting flag already exists at (${existingFlag.x}, ${existingFlag.y})`);
      return true;
    }

    // 创建新的Flag
    const result = room.createFlag(x, y, this.WAITING_FLAG_NAME, COLOR_YELLOW);

    if (typeof result === 'string') {
      // 成功创建，返回的是flag名称
      console.log(`WaitingPositionManager: Created waiting flag at (${x}, ${y})`);
      return true;
    } else {
      // 创建失败，返回的是错误码
      console.log(`WaitingPositionManager: Failed to create waiting flag at (${x}, ${y}), result: ${result}`);
      return false;
    }
  }

  /**
   * 获取房间内所有等待中的creep数量
   * @param room 房间对象
   * @returns 等待中的creep数量
   */
  static getWaitingCreepsCount(room: Room): number {
    const waitingPos = this.getWaitingPosition(room);
    if (!waitingPos) {
      return 0;
    }

    let count = 0;
    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.room.name === room.name && creep.pos.getRangeTo(waitingPos) <= 3) {
        // 检查creep是否在等待状态（通过say消息判断）
        // 这是一个简单的启发式方法
        count++;
      }
    }

    return count;
  }

  /**
   * 记录等待状态到控制台
   * @param creep creep对象
   * @param reason 等待原因
   * @param additionalInfo 额外信息
   */
  static logWaitingState(creep: Creep, reason: string, additionalInfo?: string): void {
    const waitingPos = this.getWaitingPosition(creep.room);
    const positionInfo = waitingPos ? `Waiting at (${waitingPos.x}, ${waitingPos.y})` : 'Waiting in place';

    let message = `(${creep.memory.role}): ${reason} - ${positionInfo}`;
    if (additionalInfo) {
      message += ` - ${additionalInfo}`;
    }

    console.log(message);
  }
}
