import { CreepConfig } from "../types/CreepConfig";

export class CommonConstant{
  static HARVESTER_NEED_LENGTH = 7;
  static BUILDER_NEED_LENGTH = 0;
  static UPGRADER_NEED_LENGTH = 1;
  static CARRY_NEED_LENGTH = 1;
  static HARVESTER = 'harvester';
  static UPGRADER = 'upgrader';
  static BUILDER = 'builder';
  static CARRY = 'carry';
  static SOURCE_ID_LIST:Id<Source>[] =["504d0775111fdb7", "1d190775111f525"] as Id<Source>[];

  // 塔配置
  static TOWER_ENABLED = true;
  static TOWER_ROOM_NAME = "W1N1"; // 根据实际房间名称修改

  /**
   * 兵种配置
   * priority: 数字越小优先级越高（优先生产）
   */
  static CREEP_CONFIGS: CreepConfig[] = [
    {
      role: CommonConstant.HARVESTER,
      bodyParts: [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK],
      maxCount: CommonConstant.HARVESTER_NEED_LENGTH,
      priority: 1 // 最高优先级
    },
    {
      role: CommonConstant.CARRY,
      bodyParts: [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, WORK],
      maxCount: CommonConstant.CARRY_NEED_LENGTH,
      priority: 2
    },
    {
      role: CommonConstant.UPGRADER,
      bodyParts: [MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, WORK, WORK , WORK, WORK],
      maxCount: CommonConstant.UPGRADER_NEED_LENGTH,
      priority: 3
    },
    // {
    //   role: CommonConstant.UPGRADER,
    //   bodyParts: [MOVE, MOVE,  CARRY, CARRY, WORK, WORK],
    //   maxCount: CommonConstant.UPGRADER_NEED_LENGTH,
    //   priority: 3
    // },
    {
      role: CommonConstant.BUILDER,
      bodyParts: [MOVE, MOVE, MOVE, CARRY , CARRY, CARRY, WORK,  WORK, WORK, WORK, WORK],
      maxCount: CommonConstant.BUILDER_NEED_LENGTH,
      priority: 4
    }
  ];
}
