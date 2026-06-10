# AI小说写作训练助手

轻量、私密的 AI 写作辅助工具，提供智能续写、纠错检查、伏笔管理、主题练习等功能。

## 功能概览

| 功能 | 说明 |
|------|------|
| 智能续写 | 基于上下文生成悬疑紧张/温情细腻/简洁明快三种风格续写候选，点击插入编辑器 |
| 纠错检查 | 识别语法、逻辑、标点错误，高亮定位，一键应用修改建议 |
| 伏笔管理 | AI 自动提取伏笔 + 手动添加，关键词输入时自动高亮提醒 |
| 主题练习 | 10 种内置主题，AI 生成场景引导语，风格一致性检查 |
| 文档管理 | 创建/删除/重命名，每 30 秒自动保存，跨设备云端同步 |
| 导出 Word | 一键导出 .docx 文件 |
| 新手指引 | 顶边栏入口，渲染使用说明，内置返回按钮 |

## 技术栈

- **前端**: Next.js 14 (App Router + SSR) / React 18 / TypeScript / TailwindCSS
- **编辑器**: react-simplemde-editor (CodeMirror)
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL + RLS)
- **AI**: DeepSeek API (OpenAI SDK 兼容)
- **部署**: Vercel

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_BASE_URL=https://api.deepseek.com
```

- `SUPABASE_SERVICE_ROLE_KEY`：在 Supabase 控制台 → Settings → API 获取，用于服务端绕过 RLS
- `OPENAI_API_KEY`：DeepSeek API 密钥
- `OPENAI_BASE_URL`：DeepSeek 官方地址为 `https://api.deepseek.com`（不要加 `/v1`）

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `docs/schema.sql`，创建以下表：

- `users` — 用户表（6 位数字 ID + 密码哈希）
- `writings` — 写作文档表
- `foreshadowings` — 伏笔表
- `writing_logs` — 写作日志表
- `ai_rate_limits` — AI 调用限流表

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
├── app/
│   ├── api/
│   │   ├── ai/route.ts              # 统一 AI 接口（续写/纠错/伏笔/主题/风格）
│   │   ├── auth/                     # 注册/登录/登出
│   │   ├── writings/                 # 文档 CRUD
│   │   └── foreshadowings/           # 伏笔 CRUD
│   ├── guide/                        # 新手指引页面
│   ├── page.tsx                      # 主页面（状态管理 + API 调用）
│   ├── layout.tsx                    # 根布局
│   └── globals.css                   # 全局样式
├── components/
│   ├── AuthForm.tsx                  # 登录/注册表单
│   ├── Editor.tsx                    # Markdown 编辑器 + AI 交互
│   ├── Header.tsx                    # 顶边栏（新手指引入口）
│   ├── Sidebar.tsx                   # 侧边栏（文档列表 + 伏笔箱）
│   └── NewDocumentModal.tsx          # 新建文档弹窗（主题选择）
├── lib/
│   ├── auth.ts                       # 认证逻辑（注册/登录/请求头验证）
│   ├── openai.ts                     # AI 函数（DeepSeek API 调用）
│   ├── supabase.ts                   # Supabase 客户端（普通 + service_role）
│   └── rate-limit.ts                 # 限流逻辑（10 次/分钟）
├── docs/
│   ├── requirements.md               # 需求文档
│   ├── api-spec.md                   # API 接口规范
│   ├── schema.sql                    # 数据库表结构
│   ├── design-tokens.md              # 设计规范
│   ├── acceptance.md                 # 验收记录
│   ├── user-guide.md                 # 用户使用说明
│   └── project-report.md             # 项目报告
└── prompt-logs/                      # AI 提示词归档
```

## API 概览

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（分配 6 位数字 ID） |
| POST | `/api/auth/login` | 登录（ID + 密码） |
| POST | `/api/auth/logout` | 登出 |

### AI（统一接口）

POST `/api/ai`，通过 `action` 参数区分功能：

| action | 说明 |
|--------|------|
| `continue` | 智能续写（3 种风格候选） |
| `validate` | 纠错检查（语法/逻辑/标点） |
| `extract-foreshadowings` | 伏笔提取 |
| `generate-theme-prompt` | 主题引导语生成 |
| `style-check` | 风格一致性检查 |

限流：单用户每分钟 10 次，上下文自动截断至 2000 字符。

### 文档 & 伏笔

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/writings` | 文档列表 / 创建文档 |
| GET/PUT/DELETE | `/api/writings/:id` | 文档详情 / 更新 / 删除 |
| GET/POST | `/api/foreshadowings` | 伏笔列表 / 创建伏笔 |
| PUT/DELETE | `/api/foreshadowings/:id` | 更新 / 删除伏笔 |

所有接口需携带 `X-User-Id` 请求头进行认证。

## 部署到 Vercel

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 创建新项目，关联 GitHub 仓库
3. 配置环境变量（同 `.env.local` 中的变量）
4. 触发自动部署

## 仓库地址

https://github.com/Eosere/ai-novel-writing-assistant
