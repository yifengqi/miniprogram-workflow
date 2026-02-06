# 小程序开发工作流

一个基于 Vue 3 + Element Plus 的小程序开发标准化流程工具，支持 AI 辅助生成 PRD 文档。

## 功能特性

- **需求收集器** - 结构化表单收集客户需求，分步骤引导填写
- **PRD 生成器** - 调用 AI 自动生成客户版和开发版 PRD
- **经验知识库** - 记录开发问题和解决方案，持续积累经验
- **检查清单** - 非功能性检查清单，确保项目合规、安全、高性能
- **数据管理** - 支持数据导出/导入，本地存储不丢失

## 技术栈

- Vue 3 + Composition API
- Element Plus (深色主题)
- Pinia (状态管理)
- Vue Router
- Vite (构建工具)
- Vercel (部署)

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

## 配置 AI

1. 打开「设置」页面
2. 填写 API 端点（支持 OpenAI、Anthropic、DeepSeek 及各种中转站）
3. 填写 API Key
4. 选择模型
5. 点击「测试连接」确认配置正确

### 支持的 AI 服务

| 服务 | API 端点 | 模型示例 |
|------|----------|----------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | gpt-4o, gpt-4o-mini |
| Anthropic | `https://api.anthropic.com/v1/messages` | claude-3-5-sonnet-20241022 |
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | deepseek-chat |
| 中转站 | 根据服务商提供的地址 | 根据服务商支持的模型 |

## 部署到 Vercel

1. Fork 或推送代码到 GitHub
2. 在 Vercel 中导入项目
3. 自动检测为 Vite 项目并部署
4. 可选：绑定自定义域名

## 数据存储

所有数据存储在浏览器 localStorage 中：

- 项目数据（需求、PRD）
- 经验知识库
- 检查清单进度
- AI 配置（API Key 仅本地存储，不上传）

**建议定期导出备份！**

## 基于项目

本工具基于「星见 StelRen 小程序」项目实践经验开发，内置了来自该项目的 10 条核心经验。

## 许可

MIT License
