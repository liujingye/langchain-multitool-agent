import { calculatorTool } from './calculator.js';
import { searchTool } from './search.js';
import { weatherTool } from './weather.js';

// 新增工具：在 tools/ 下实现后注册到这里即可，Agent 无需改动
export const tools = [weatherTool, calculatorTool, searchTool];

// 需要访问外部网络、值得重试的工具
export const networkToolNames = [weatherTool.name, searchTool.name];
