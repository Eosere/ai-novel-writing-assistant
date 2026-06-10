-- AI小说写作训练助手 - 数据库表结构

-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 写作文档表
CREATE TABLE writings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  title VARCHAR(255) DEFAULT '未命名文档',
  content TEXT DEFAULT '',
  theme VARCHAR(100),
  theme_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 伏笔表
CREATE TABLE foreshadowings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  writing_id INTEGER REFERENCES writings(id),
  content TEXT NOT NULL,
  position_index INTEGER NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  keywords TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 写作日志表
CREATE TABLE writing_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  writing_id INTEGER REFERENCES writings(id),
  action_type VARCHAR(50) NOT NULL,
  action_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI调用限流表
CREATE TABLE ai_rate_limits (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  request_count INTEGER DEFAULT 0,
  last_request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 行级安全策略
-- 用户只能访问自己的数据
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (user_id = current_setting('app.current_user_id'));

CREATE POLICY "Writings are user-specific" ON writings
  FOR ALL USING (user_id = current_setting('app.current_user_id'));

CREATE POLICY "Foreshadowings are user-specific" ON foreshadowings
  FOR ALL USING (user_id = current_setting('app.current_user_id'));

CREATE POLICY "Logs are user-specific" ON writing_logs
  FOR ALL USING (user_id = current_setting('app.current_user_id'));

CREATE POLICY "Rate limits are user-specific" ON ai_rate_limits
  FOR ALL USING (user_id = current_setting('app.current_user_id'));
