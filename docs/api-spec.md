# AI小说写作训练助手 - API接口规范

## 一、认证接口

### 1. 注册
- **路径**: `POST /api/auth/register`
- **请求体**:
```json
{
  "password": "string (6-32位)"
}
```
- **响应**:
```json
{
  "success": true,
  "user_id": "string",
  "message": "注册成功"
}
```

### 2. 登录
- **路径**: `POST /api/auth/login`
- **请求体**:
```json
{
  "user_id": "string",
  "password": "string"
}
```
- **响应**:
```json
{
  "success": true,
  "user_id": "string",
  "message": "登录成功"
}
```

### 3. 登出
- **路径**: `POST /api/auth/logout`
- **响应**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

## 二、写作文档接口

### 1. 获取文档列表
- **路径**: `GET /api/writings`
- **响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": number,
      "title": "string",
      "content": "string",
      "theme": "string | null",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

### 2. 获取单个文档
- **路径**: `GET /api/writings/:id`
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": number,
    "title": "string",
    "content": "string",
    "theme": "string | null",
    "theme_prompt": "string | null",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 3. 创建文档
- **路径**: `POST /api/writings`
- **请求体**:
```json
{
  "title": "string (可选)",
  "theme": "string (可选)",
  "theme_prompt": "string (可选)"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": number,
    "title": "string",
    "content": "string",
    "theme": "string | null",
    "theme_prompt": "string | null",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 4. 更新文档
- **路径**: `PUT /api/writings/:id`
- **请求体**:
```json
{
  "title": "string (可选)",
  "content": "string (可选)",
  "theme": "string (可选)",
  "theme_prompt": "string (可选)"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": number,
    "title": "string",
    "content": "string",
    "theme": "string | null",
    "theme_prompt": "string | null",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 5. 删除文档
- **路径**: `DELETE /api/writings/:id`
- **响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

## 三、统一AI接口（推荐）

### 统一AI入口
- **路径**: `POST /api/ai`
- **请求体**:
```json
{
  "action": "string (required: continue/validate/extract-foreshadowings/generate-theme-prompt/style-check)",
  "context": "string (用于continue)",
  "text": "string (用于validate/extract-foreshadowings/style-check)",
  "theme": "string (用于generate-theme-prompt/style-check)",
  "writing_id": "number (可选)"
}
```
- **通用响应结构**:
```json
{
  "success": true,
  "data": { ... },
  "remaining_requests": number,
  "reset_in": "string (可选)"
}
```

### 限流说明
- 单用户每分钟最多10次AI调用
- 超出限制返回HTTP 429状态码
- 上下文自动截断至2000字符以内
- 请求超时8秒，支持2次重试

#### 1. 智能续写 (action: continue)
- **请求体**:
```json
{
  "action": "continue",
  "context": "string (至少50字，最多2000字)",
  "writing_id": number (可选)
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "id": number,
        "style": "string (悬疑紧张/温情细腻/简洁明快)",
        "content": "string (不超过150字)"
      }
    ]
  },
  "remaining_requests": number
}
```

#### 2. 纠错检查 (action: validate)
- **请求体**:
```json
{
  "action": "validate",
  "text": "string (最多2000字)"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "id": number,
        "type": "string (grammar/logic/punctuation)",
        "message": "string",
        "suggestion": "string",
        "startIndex": number,
        "endIndex": number
      }
    ]
  },
  "remaining_requests": number
}
```

#### 3. 伏笔提取 (action: extract-foreshadowings)
- **请求体**:
```json
{
  "action": "extract-foreshadowings",
  "text": "string (最多2000字)",
  "writing_id": number
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "foreshadowings": [
      {
        "content": "string",
        "keywords": ["string"]
      }
    ]
  },
  "remaining_requests": number
}
```

#### 4. 主题引导语生成 (action: generate-theme-prompt)
- **请求体**:
```json
{
  "action": "generate-theme-prompt",
  "theme": "string"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "prompt": "string (不超过200字)"
  },
  "remaining_requests": number
}
```

#### 5. 风格检查 (action: style-check)
- **请求体**:
```json
{
  "action": "style-check",
  "text": "string",
  "theme": "string"
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "feedback": "string"
  },
  "remaining_requests": number
}
```

## 四、伏笔接口

### 1. 获取伏笔列表
- **路径**: `GET /api/foreshadowings`
- **查询参数**: `writing_id` (可选)
- **响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": number,
      "content": "string",
      "writing_id": number,
      "position_index": number,
      "used": boolean,
      "keywords": ["string"],
      "created_at": "timestamp"
    }
  ]
}
```

### 2. 创建伏笔
- **路径**: `POST /api/foreshadowings`
- **请求体**:
```json
{
  "content": "string",
  "writing_id": number,
  "position_index": number,
  "keywords": ["string"]
}
```
- **响应**:
```json
{
  "success": true,
  "data": {
    "id": number,
    "content": "string",
    "used": false,
    "created_at": "timestamp"
  }
}
```

### 3. 更新伏笔
- **路径**: `PUT /api/foreshadowings/:id`
- **请求体**:
```json
{
  "content": "string (可选)",
  "used": boolean (可选),
  "keywords": ["string"] (可选)
}
```
- **响应**:
```json
{
  "success": true,
  "message": "更新成功"
}
```

### 4. 删除伏笔
- **路径**: `DELETE /api/foreshadowings/:id`
- **响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

## 五、错误响应格式

### 通用错误响应
```json
{
  "success": false,
  "error": "string",
  "remaining_requests": number (可选),
  "reset_in": "string (可选)"
}
```

### HTTP状态码
| 状态码 | 含义 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或认证失败 |
| 429 | AI调用次数超限 |
| 500 | 服务器内部错误 |