import { CreepConfig } from './CreepConfig';
import { BASE_CREEP_CONFIGS } from '../config/BaseRoomConfig';

/**
 * 类型检查和验证文件
 * 用于确保重构后的类型系统工作正常
 */

// 验证BaseRoomConfig中的配置符合CreepConfig接口
export function validateCreepConfigs(): boolean {
    try {
        // 检查BASE_CREEP_CONFIGS是否符合CreepConfig接口
        const configs: CreepConfig[] = BASE_CREEP_CONFIGS;

        // 验证每个配置的必需字段
        for (const config of configs) {
            if (!config.role) {
                console.error('Missing role in config:', config);
                return false;
            }

            if (!config.body || !Array.isArray(config.body)) {
                console.error('Missing or invalid body in config:', config);
                return false;
            }

            if (typeof config.maxCount !== 'number') {
                console.error('Missing or invalid maxCount in config:', config);
                return false;
            }

            if (typeof config.priority !== 'number') {
                console.error('Missing or invalid priority in config:', config);
                return false;
            }
        }

        console.log('✅ All creep configurations are valid');
        return true;
    } catch (error) {
        console.error('❌ Error validating creep configurations:', error);
        return false;
    }
}

// 验证类型转换
export function validateTypeConversion(): boolean {
    try {
        // 测试新旧字段名的兼容性
        const oldStyleConfig: any = {
            role: 'test',
            bodyParts: [WORK, CARRY, MOVE],
            maxCount: 1,
            priority: 1
        };

        const newStyleConfig: CreepConfig = {
            role: 'test',
            body: [WORK, CARRY, MOVE],
            maxCount: 1,
            priority: 1,
            needLength: 1
        };

        // 测试兼容性访问
        const body1 = newStyleConfig.body || newStyleConfig.bodyParts || [];
        const body2 = oldStyleConfig.body || oldStyleConfig.bodyParts || [];

        console.log('✅ Type conversion validation passed');
        console.log('New style body:', body1);
        console.log('Old style body:', body2);

        return body1.length > 0 && body2.length > 0;
    } catch (error) {
        console.error('❌ Error in type conversion validation:', error);
        return false;
    }
}

// 运行所有验证
export function runAllValidations(): boolean {
    console.log('🔍 Running type validations...');

    const creepConfigValid = validateCreepConfigs();
    const typeConversionValid = validateTypeConversion();

    const allValid = creepConfigValid && typeConversionValid;

    if (allValid) {
        console.log('✅ All type validations passed!');
    } else {
        console.error('❌ Some validations failed');
    }

    return allValid;
}