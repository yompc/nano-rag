# Nano-RAG 部署指南

## 环境要求

- Node.js 22.13+ 或更高版本
- Cloudflare 账户
- Wrangler CLI (已包含在依赖中，通过 `npx wrangler` 使用)
- Mistral API Key

## 1. 本地开发环境设置

### 1.1 安装依赖

```bash
npm install
```

### 1.2 配置环境变量

复制 `.dev.vars.example` 为 `.dev.vars`：

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars` 文件，填入真实的 Mistral API Key：

```
MISTRAL_API_KEY=your-mistral-api-key-here
```

### 1.3 初始化本地数据库

本地开发使用 D1 的 local 模式，数据库文件存储在 `.wrangler/state/` 目录：

```bash
# 执行数据库迁移（本地模式）
npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql
```

注意：本地开发不需要创建远程数据库，`wrangler.toml` 中已配置 `database_id = "local"`。

### 1.4 本地预览测试

使用 Cloudflare Workers 本地运行时测试（推荐）：

```bash
npm run preview
```

访问 http://localhost:8787

### 1.5 纯开发模式（可选）

如果只需要快速开发 UI，可以用纯 Next.js dev 模式：

```bash
npm run dev
```

访问 http://localhost:3000

注意：此模式下 D1 数据库不可用，API 路由会报错。

## 2. 生产环境部署

### 2.1 创建 Cloudflare D1 数据库

```bash
# 创建生产数据库
npx wrangler d1 create nano-rag-production-db

# 记录返回的 database_id，格式类似：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2.2 配置 wrangler.toml

编辑 `wrangler.toml`，更新生产环境的 database_id：

```toml
[[d1_databases]]
binding = "DB"
database_name = "nano-rag-db"
database_id = "local"  # 本地开发

[env.production]
name = "nano-rag-production"
[[env.production.d1_databases]]
binding = "DB"
database_name = "nano-rag-production-db"
database_id = "your-production-database-id"  # 替换为步骤 2.1 返回的 ID
```

### 2.3 执行生产数据库迁移

```bash
npx wrangler d1 execute nano-rag-production-db --remote --file=./migrations/0001_init.sql
```

### 2.4 配置生产环境变量

生产环境的敏感信息需要通过 Wrangler secrets 设置：

```bash
# 设置 Mistral/OpenAI API Key
npx wrangler secret put OPENAI_API_KEY
# 按提示输入 API Key

# 设置管理员密码（用于访问管理界面和受保护的 API）
npx wrangler secret put ADMIN_PASSWORD
# 按提示输入管理员密码
```

**重要提示**：
- 密码和 API Key 等敏感信息不要硬编码在代码或配置文件中
- 使用 `wrangler secret list` 查看已配置的 secrets
- Secrets 在 Cloudflare Dashboard 的 Workers > Settings > Variables 中管理

### 2.5 部署应用

```bash
npm run deploy
```

部署成功后，会输出生产环境 URL。

## 3. Staging 环境部署

### 3.1 创建 Staging 数据库

```bash
npx wrangler d1 create nano-rag-staging-db
```

### 3.2 更新 wrangler.toml

```toml
[env.staging]
name = "nano-rag-staging"
[[env.staging.d1_databases]]
binding = "DB"
database_name = "nano-rag-staging-db"
database_id = "your-staging-database-id"
```

### 3.3 配置 Staging 环境变量

```bash
npx wrangler secret put MISTRAL_API_KEY --env staging
```

### 3.4 部署到 Staging

```bash
npx wrangler deploy --env staging
```

## 4. 数据导入

### 4.1 上传 PDF 文档

使用应用界面的文档上传功能，或通过 API：

```bash
curl -X POST https://your-app.workers.dev/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf" \
  -F "docType=paper"
```

### 4.2 验证数据导入

查询数据库验证：

```bash
npx wrangler d1 execute nano-rag-production-db --remote \
  --command "SELECT COUNT(*) FROM chunks"
```

## 5. 监控和日志

### 5.1 查看实时日志

```bash
npx wrangler tail
```

### 5.2 查看 D1 数据库指标

在 Cloudflare Dashboard 中：
- Workers & Pages > nano-rag-production > Metrics

## 6. 常见问题

### Q: 部署失败，提示 database_id 错误
A: 确保 `wrangler.toml` 中的 database_id 是正确的生产数据库 ID

### Q: API 返回 "MISTRAL_API_KEY未配置"
A: 检查环境变量是否正确设置：
```bash
npx wrangler secret list
```

### Q: 本地预览时数据库连接失败
A: 确保：
1. `.dev.vars` 文件存在且配置正确
2. 本地数据库已执行迁移：`npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql`

### Q: 向量检索结果为空
A: 检查：
1. 数据库中是否有数据
2. Mistral API Key 是否有效
3. Embedding 是否正常生成

### Q: 页面返回 404
A: 确保 `wrangler.toml` 中有 `[assets]` 配置：
```toml
[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

## 7. 回滚

如果部署出现问题，可以回滚到之前的版本：

```bash
# 查看部署历史
npx wrangler deployments list

# 回滚到指定版本
npx wrangler rollback --version <version-id>
```

## 8. 安全建议

1. **API Key 管理**
   - 使用 Wrangler secrets 存储敏感信息
   - 定期轮换 API Key
   - 不要在代码中硬编码密钥

2. **访问控制**
   - 考虑添加身份验证
   - 限制 API 调用频率
   - 监控异常访问

3. **数据安全**
   - 定期备份 D1 数据库
   - 实施数据保留策略

## 9. 性能优化

1. **数据库优化**
   - 定期清理过期数据
   - 监控查询性能

2. **缓存策略**
   - 使用 Cloudflare Cache API
   - 考虑缓存常用查询结果

3. **资源限制**
   - 监控 Worker CPU 和内存使用
   - Worker 内存上限：免费 128MB，付费 2GB
   - 包大小上限：免费 1MB，付费 10MB（压缩后）

## 10. 相关链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare 文档](https://opennext.js.org/cloudflare)
- [Next.js 文档](https://nextjs.org/docs)
- [Mistral AI API 文档](https://docs.mistral.ai/)