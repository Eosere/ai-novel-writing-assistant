# AI小说写作训练助手 - 设计规范

## 一、配色方案

### 主色调
- **primary-50**: #f0f9ff
- **primary-100**: #e0f2fe
- **primary-200**: #bae6fd
- **primary-300**: #7dd3fc
- **primary-400**: #38bdf8
- **primary-500**: #0ea5e9
- **primary-600**: #0284c7
- **primary-700**: #0369a1
- **primary-800**: #075985
- **primary-900**: #0c4a6e

### 强调色
- **accent-50**: #fdf4ff
- **accent-100**: #fae8ff
- **accent-200**: #f5d0fe
- **accent-300**: #f0abfc
- **accent-400**: #e879f9
- **accent-500**: #d946ef
- **accent-600**: #c026d3
- **accent-700**: #a21caf
- **accent-800**: #86198f
- **accent-900**: #701a75

### 中性色
- **gray-50**: #f9fafb
- **gray-100**: #f3f4f6
- **gray-200**: #e5e7eb
- **gray-300**: #d1d5db
- **gray-400**: #9ca3af
- **gray-500**: #6b7280
- **gray-600**: #4b5563
- **gray-700**: #374151
- **gray-800**: #1f2937
- **gray-900**: #111827

### 状态色
- **success**: #10b981
- **warning**: #f59e0b
- **error**: #ef4444
- **info**: #3b82f6

## 二、间距规范

### 间距单位
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px

### 组件间距
- **padding-xs**: 4px
- **padding-sm**: 8px
- **padding-md**: 16px
- **padding-lg**: 24px
- **margin-xs**: 4px
- **margin-sm**: 8px
- **margin-md**: 16px
- **margin-lg**: 24px

## 三、字体规范

### 字体族
- **主字体**: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **等宽字体**: 'JetBrains Mono', 'Fira Code', monospace

### 字体大小
- **text-xs**: 12px
- **text-sm**: 14px
- **text-base**: 16px
- **text-lg**: 18px
- **text-xl**: 20px
- **text-2xl**: 24px
- **text-3xl**: 30px
- **text-4xl**: 36px

### 字体粗细
- **font-thin**: 100
- **font-extralight**: 200
- **font-light**: 300
- **font-normal**: 400
- **font-medium**: 500
- **font-semibold**: 600
- **font-bold**: 700
- **font-extrabold**: 800
- **font-black**: 900

## 四、圆角规范

- **rounded-none**: 0px
- **rounded-sm**: 2px
- **rounded**: 4px
- **rounded-md**: 6px
- **rounded-lg**: 8px
- **rounded-xl**: 12px
- **rounded-2xl**: 16px
- **rounded-full**: 9999px

## 五、阴影规范

- **shadow-sm**: 0 1px 2px 0 rgb(0 0 0 / 0.05)
- **shadow**: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
- **shadow-md**: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
- **shadow-lg**: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- **shadow-xl**: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)

## 六、图标规范

### 图标尺寸
- **icon-xs**: 16px
- **icon-sm**: 20px
- **icon-md**: 24px
- **icon-lg**: 32px
- **icon-xl**: 48px

### 图标颜色
- 默认使用当前文本颜色
- 可根据状态变化颜色

## 七、按钮规范

### 按钮类型
- **primary**: 主操作按钮，使用 primary-500
- **secondary**: 次要操作按钮，使用 gray-500
- **outline**: 轮廓按钮，使用透明背景+边框
- **ghost**: 幽灵按钮，仅悬停时有背景

### 按钮尺寸
- **sm**: 32px 高度，padding 0 16px
- **md**: 40px 高度，padding 0 24px
- **lg**: 48px 高度，padding 0 32px

## 八、输入框规范

### 输入框状态
- **default**: 默认状态
- **focus**: 聚焦状态，边框高亮
- **error**: 错误状态，边框红色
- **disabled**: 禁用状态，透明度降低

### 输入框样式
- 圆角: rounded-lg
- 边框: 1px solid gray-300
- 聚焦边框: 2px solid primary-500
- 内边距: 12px 16px

## 九、布局规范

### 容器宽度
- **max-w-xs**: 480px
- **max-w-sm**: 640px
- **max-w-md**: 768px
- **max-w-lg**: 1024px
- **max-w-xl**: 1280px
- **max-w-2xl**: 1536px

### 网格布局
- **grid-cols-1**: 1列
- **grid-cols-2**: 2列
- **grid-cols-3**: 3列
- **grid-cols-4**: 4列

## 十、动画规范

### 过渡动画
- **duration-fast**: 150ms
- **duration-normal**: 300ms
- **duration-slow**: 500ms

### 缓动函数
- **ease-in-out**: cubic-bezier(0.4, 0, 0.2, 1)
- **ease-out**: cubic-bezier(0, 0, 0.2, 1)
- **ease-in**: cubic-bezier(0.4, 0, 1, 1)

### 动画类型
- **fade-in**: 淡入效果
- **slide-up**: 向上滑入
- **slide-down**: 向下滑入
- **slide-left**: 向左滑入
- **slide-right**: 向右滑入
- **scale-in**: 缩放进入
