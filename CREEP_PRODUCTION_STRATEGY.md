# 🤖 Creep生产策略详解

## 🎯 问题解决

**原始问题**: 之前的代码只检查harvester需求，导致只能生产采集者，建造工厂等其他类型creep无法正常生产。

**解决方案**: 实现智能生产决策系统，根据房间状态和RCL等级动态调整生产策略。

## 🧠 智能生产决策逻辑

### 核心函数: `shouldProduceCreeps(roomManager)`

该函数根据以下因素决定是否需要生产creep：
- **房间状态** (RoomState)
- **RCL等级** (Room Controller Level)
- **各类型creep数量** (通过`needsCreepProduction`检查)

## 📋 生产策略矩阵

### 1. 紧急状态 (Emergency)
```typescript
if (roomState === 'emergency') {
  return needsHarvester;  // 只生产采集者
}
```
**策略**: 保证基本生存，只生产harvester

### 2. 低能量状态 (Low Energy)
```typescript
if (roomState === 'low_energy') {
  return needsHarvester ||
         roomManager.needsCreepProduction('carry') ||
         roomManager.needsCreepProduction('containerCarry');
}
```
**策略**: 重点保证能量采集和运输

### 3. 攻击状态 (Under Attack)
```typescript
if (roomState === 'under_attack') {
  return needsHarvester ||
         roomManager.needsCreepProduction('upgrader') ||
         roomManager.needsCreepProduction('carry');
}
```
**策略**: 保证基本运转，暂停建造活动

### 4. 发展状态 (Developing)
```typescript
if (roomState === 'developing') {
  return needsHarvester ||
         roomManager.needsCreepProduction('builder') ||
         roomManager.needsCreepProduction('upgrader') ||
         roomManager.needsCreepProduction('carry') ||
         roomManager.needsCreepProduction('containerCarry');
}
```
**策略**: 全面发展，重点建设

### 5. 正常状态 (Normal) - 按RCL分级

#### 早期RCL (1-3)
```typescript
if (rcl <= 3) {
  return needsHarvester ||
         roomManager.needsCreepProduction('upgrader') ||
         roomManager.needsCreepProduction('carry');
}
```
**策略**: 重点采集和升级

#### 中期RCL (4-6)
```typescript
if (rcl <= 6) {
  return needsHarvester ||
         roomManager.needsCreepProduction('builder') ||
         roomManager.needsCreepProduction('upgrader') ||
         roomManager.needsCreepProduction('carry') ||
         roomManager.needsCreepProduction('containerCarry');
}
```
**策略**: 平衡发展

#### 高级RCL (7-8)
```typescript
else {
  return needsHarvester ||
         roomManager.needsCreepProduction('builder') ||
         roomManager.needsCreepProduction('upgrader') ||
         roomManager.needsCreepProduction('carry') ||
         roomManager.needsCreepProduction('containerCarry') ||
         roomManager.needsCreepProduction('storageCarry');
}
```
**策略**: 全面发展，启用高级物流

## 🔄 生产执行流程

```typescript
// 1. 更新房间状态
roomManager.updateRoomStatus();

// 2. 获取当前配置
const creepConfigs = roomManager.getCurrentCreepConfigs();

// 3. 智能决策是否需要生产
if (shouldProduceCreeps(roomManager)) {
  // 4. 执行生产（按优先级）
  const productionResult = creepFactory.greedyProduction(creepConfigs);
}
```

## 🎛️ 配置驱动

生产策略由房间配置文件控制：
- **creepConfigs**: 定义各类型creep的优先级和数量上限
- **stateBasedConfigs**: 不同状态下的不同配置
- **productionStrategy**: aggressive/conservative/balanced

### 示例配置 (W1N1.ts)
```typescript
stateBasedConfigs: {
  [RoomState.DEVELOPING]: {
    creepConfigs: BASE_CREEP_CONFIGS.map(config => {
      if (config.role === ROLE_NAMES.BUILDER) {
        return { ...config, maxCount: config.maxCount * 1.5 };
      }
      return config;
    }),
    productionStrategy: 'aggressive',
  },
  [RoomState.EMERGENCY]: {
    creepConfigs: BASE_CREEP_CONFIGS.filter(config =>
      config.role === ROLE_NAMES.HARVESTER
    ).map(config => ({ ...config, maxCount: 1 })),
    productionStrategy: 'conservative',
  }
}
```

## 🔍 优势

1. **智能化**: 根据实际房间状态动态调整
2. **适应性**: 不同RCL等级有不同策略
3. **优先级**: 保证关键creep（如harvester）优先生产
4. **资源优化**: 避免不必要的creep生产浪费资源
5. **状态感知**: 攻击时暂停建造，紧急时只保生存

## 📊 监控和调试

生产日志示例：
```
[W1N1] Successfully spawned Harvester-20231028-001234 (normal)
[W1N1] Successfully spawned Builder-20231028-001235 (developing)
[W1N1] Production failed: All creep types are at maximum capacity
```

## 🚀 未来扩展

1. **机器学习**: 基于历史数据优化生产策略
2. **跨房间协调**: 多房间间的creep调配
3. **经济分析**: 根据资源效率调整生产比例
4. **威胁评估**: 根据威胁等级调整防御相关creep生产

---

**总结**: 新的生产策略系统确保了各种类型creep都能根据房间实际需求得到生产，同时保持了智能化和适应性。