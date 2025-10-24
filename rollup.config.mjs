"use strict";

// 1. 导入所有需要的模块
import clear from 'rollup-plugin-clear';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import screeps from 'rollup-plugin-screeps';

// 2. 使用 import 断言来导入 JSON 文件
import screepsConfig from './screeps.json' with { type: 'json' };

// 3. 检查环境变量和配置
let cfg;
const dest = process.env.DEST;

if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = screepsConfig[dest]) == null) { // 4. 使用导入的配置对象
  throw new Error("Invalid upload destination");
}

// 5. 导出 Rollup 配置
export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true
  },

  plugins: [
    clear({ targets: ["dist"] }),
    resolve({ rootDir: "src" }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    screeps({ config: cfg, dryRun: cfg == null })
  ]
};
