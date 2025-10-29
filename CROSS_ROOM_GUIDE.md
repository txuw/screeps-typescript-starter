# 跨房间Builder和Upgrader使用指南

## 概述

本系统新增了两个专门的跨房间角色：
- **CrossRoomBuilder (跨房间建造者)**：专门建造属于我的Spawn，部件配置 12MOVE + 6CARRY + 6WORK
- **CrossRoomUpgrader (跨房间升级者)**：当另一个房间Spawn未建造完成时，持续派去升级Controller

## 主要特性

### CrossRoomBuilder
- 高移动性配置（12MOVE）确保快速到达目标房间
- 足够的工作能力（6WORK+6CARRY）保证建造效率
- 智能建造优先级：Spawn > Extension > Container > Road > Tower > Storage > Link
- 自动能量补给策略：在主房间装满能量后前往目标房间
- 任务完成检测和状态更新

### CrossRoomUpgrader
- 平衡的移动性和工作能力（10MOVE + 8CARRY + 6WORK）
- 智能升级策略：当目标房间Spawn未建成时持续工作
- 自动停止条件：Spawn建成或达到目标RCL等级
- 能量高效的升级策略
- 多目标房间的智能轮换

## 配置方法

### 1. 基础配置

在你的房间配置中启用跨房间功能：

```typescript
const roomConfig = createRoomConfig('YourMainRoom', {
    crossRoomConfig: {
        // 启用跨房间功能
        crossRoomEnabled: true,

        // 跨房间建造目标
        buildTargets: [
            {
                roomName: 'TargetRoomName',
                priority: 1,
                requiredStructures: [STRUCTURE_SPAWN, STRUCTURE_EXTENSION],
                status: 'pending',
                assignedCreeps: []
            }
        ],

        // 跨房间升级目标
        upgradeTargets: [
            {
                roomName: 'TargetRoomName',
                priority: 1,
                targetRCL: 4,
                currentRCL: 1,
                active: true,
                assignedCreeps: [],
                stopWhenSpawnBuilt: true
            }
        ],

        // 跨房间creep配置
        maxCrossRoomBuilders: 2,
        maxCrossRoomUpgraders: 1,
        minEnergyForCrossRoom: 1000
    }
});
```

### 2. Creep生产配置

在creep生产配置中添加跨房间角色：

```typescript
creepProduction: {
    stateBasedConfigs: {
        normal: {
            creepConfigs: [
                // 基础角色...

                // 跨房间建造者
                {
                    role: ROLE_NAMES.CROSS_ROOM_BUILDER,
                    body: [], // 将由系统动态生成
                    maxCount: 2,
                    priority: 3, // 较高优先级
                    needLength: 1,
                },

                // 跨房间升级者
                {
                    role: ROLE_NAMES.CROSS_ROOM_UPGRADER,
                    body: [], // 将由系统动态生成
                    maxCount: 1,
                    priority: 2, // 较高优先级
                    needLength: 1,
                }
            ]
        }
    }
}
```

## 工作流程

### CrossRoomBuilder工作流程
1. **初始能量**：在主房间从Storage/Container获取初始能量（80%容量）
2. **跨房间移动**：使用最短路径前往目标房间
3. **本地采集**：在目标房间从Source直接采集能量，可持续工作
4. **建造任务**：按照优先级建造结构（Spawn优先）
5. **状态更新**：完成任务后更新目标状态
6. **继续工作**：在目标房间持续工作，无需频繁返回主房间

### CrossRoomUpgrader工作流程
1. **需求检查**：检查目标房间是否需要升级
2. **初始能量**：在主房间从Storage/Container获取初始能量（80%容量）
3. **跨房间移动**：前往目标房间
4. **本地采集**：在目标房间从Source直接采集能量，可持续工作
5. **升级任务**：持续升级Controller
6. **状态监控**：检查Spawn建造状态和RCL等级
7. **智能停止**：满足停止条件时返回主房间

## 资源策略

### 智能能量管理
跨房间creep采用双层能量策略：

**主房间阶段：**
- 从Storage和Container获取预充能量
- 加载到80%容量以节省时间
- 避免完全装满，留有容量用于目标房间采集

**目标房间阶段：**
- 从Source直接采集能量
- 自给自足，无需频繁返回主房间
- 可以在目标房间长期持续工作

### 优势
- **效率提升**：减少往返次数，提高工作效率
- **资源独立**：目标房间creep可以独立工作
- **负载均衡**：减轻主房间资源压力
- **快速响应**：在目标房间立即响应能量需求

## 智能决策系统

### 自动生产决策
系统会根据以下条件自动决定是否生产跨房间creep：
- 跨房间功能是否启用
- 主房间是否有足够能量（>= 1000）
- 当前跨房间creep数量是否达到上限
- 是否有有效的跨房间目标

### 目标有效性检查
- **建造目标**：检查目标房间是否需要建造Spawn
- **升级目标**：检查目标房间是否需要升级Controller
- **停止条件**：检查是否满足停止工作的条件

## 最佳实践

### 1. 房间选择
- 选择能量充足的主房间作为跨房间creep的生产基地
- 确保主房间RCL >= 4，有稳定的能量供应
- 目标房间应该是已占领但缺少基础设施的房间

### 2. 优先级设置
- 建造优先级设置高于升级优先级
- 多个目标房间时，根据距离和重要性设置优先级
- 优先建造Spawn，然后是Extension等关键结构

### 3. 数量控制
- 根据主房间的能量生产能力设置合适的creep数量
- 避免过度生产跨房间creep影响主房间发展
- 建议初始设置：maxCrossRoomBuilders: 2, maxCrossRoomUpgraders: 1

### 4. 能量管理
- 设置合理的minEnergyForCrossRoom（推荐1000-1500）
- 确保主房间有足够的Storage或Container存储能量
- 监控跨房间creep的能量消耗情况

## 监控和调试

### 任务状态查看
```typescript
// 获取任务统计
const targetManager = CrossRoomTargetManager.getInstance();
const stats = targetManager.getTaskStatistics('YourMainRoom');
console.log('跨房间任务统计:', stats);

// 获取特定房间的任务
const tasks = targetManager.getTasksByHomeRoom('YourMainRoom');
console.log('跨房间任务列表:', tasks);
```

### 日志输出
系统会输出详细的日志信息：
- `[CrossRoomBuilder]` - 建造者相关日志
- `[CrossRoomUpgrader]` - 升级者相关日志
- `[CrossRoomTargetManager]` - 任务管理相关日志

## 故障排除

### 常见问题

**Q: 跨房间creep没有生产？**
A: 检查以下条件：
- crossRoomEnabled是否设置为true
- 主房间能量是否>= minEnergyForCrossRoom
- 是否有有效的跨房间目标
- 当前creep数量是否达到上限

**Q: 跨房间creep卡在主房间？**
A: 可能原因：
- 主房间能量不足，无法补充
- 找不到到目标房间的路径
- 目标房间状态发生变化，不再需要建造或升级

**Q: 建造效率低？**
A: 优化建议：
- 确保部件配置正确（12MOVE + 6CARRY + 6WORK）
- 优化建造目标优先级
- 检查目标房间的能量供应情况

## 扩展功能

### 自定义优先级
可以通过修改`GLOBAL_ALGORITHM_CONFIG.CROSS_ROOM_CONFIG.BUILD_PRIORITIES`来自定义建造优先级。

### 动态调整
系统支持根据游戏进程动态调整跨房间策略，可以通过修改RoomConfig来实现。

### 多房间协同
支持多个主房间协同工作，各自负责不同的跨房间目标。

## 示例配置

参考`src/config/CrossRoomExampleConfig.ts`查看完整的配置示例。

---

如有问题或建议，请查看代码注释或联系开发者。