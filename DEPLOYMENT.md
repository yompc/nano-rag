# Nano-RAG Deployment Guide

## Requirements

- Node.js 22.13+ or higher
- Cloudflare account
- Wrangler CLI (included in dependencies, use via `npx wrangler`)
- OpenAI API Key

## 1. Local Development Setup

### 1.1 Install Dependencies

```bash
npm install
```

### 1.2 Configure Environment Variables

Copy `.dev.vars.example` to `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` file, fill in your actual OpenAI API Key:

```
OPENAI_API_KEY=your-openai-api-key-here
```

### 1.3 Initialize Local Database

Local development uses D1's local mode, database files are stored in `.wrangler/state/` directory:

```bash
# Execute database migration (local mode)
npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql
```

Note: Local development doesn't require creating a remote database, `wrangler.toml` is already configured with `database_id = "local"`.

### 1.4 Local Preview Test

Test using Cloudflare Workers local runtime (recommended):

```bash
npm run preview
```

Visit http://localhost:8787

### 1.5 Pure Development Mode (Optional)

If you only need to quickly develop UI, you can use pure Next.js dev mode:

```bash
npm run dev
```

Visit http://localhost:3000

Note: D1 database is not available in this mode, API routes will error.

## 2. Production Deployment

### 2.1 Create Cloudflare D1 Database

```bash
# Create production database
npx wrangler d1 create nano-rag-production-db

# Record the returned database_id, format like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2.2 Configure wrangler.toml

Edit `wrangler.toml`, update the production database_id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "nano-rag-db"
database_id = "local"  # Local development

[env.production]
name = "nano-rag-production"
[[env.production.d1_databases]]
binding = "DB"
database_name = "nano-rag-production-db"
database_id = "your-production-database-id"  # Replace with ID from step 2.1
```

### 2.3 Execute Production Database Migration

```bash
npx wrangler d1 execute nano-rag-production-db --remote --file=./migrations/0001_init.sql
```

### 2.4 Configure Production Environment Variables

Production secrets must be set via Wrangler secrets:

```bash
# Set OpenAI API Key
npx wrangler secret put OPENAI_API_KEY
# Enter API Key when prompted

# Set admin password (for accessing admin interface and protected APIs)
npx wrangler secret put ADMIN_PASSWORD
# Enter admin password when prompted
```

**Important Notes**:
- Don't hardcode passwords and API keys in code or config files
- Use `wrangler secret list` to view configured secrets
- Secrets are managed in Cloudflare Dashboard > Workers > Settings > Variables

### 2.5 Deploy Application

```bash
npm run deploy
```

After successful deployment, the production URL will be output.

## 3. Staging Environment Deployment

### 3.1 Create Staging Database

```bash
npx wrangler d1 create nano-rag-staging-db
```

### 3.2 Update wrangler.toml

```toml
[env.staging]
name = "nano-rag-staging"
[[env.staging.d1_databases]]
binding = "DB"
database_name = "nano-rag-staging-db"
database_id = "your-staging-database-id"
```

### 3.3 Configure Staging Environment Variables

```bash
npx wrangler secret put OPENAI_API_KEY --env staging
```

### 3.4 Deploy to Staging

```bash
npx wrangler deploy --env staging
```

## 4. Data Import

### 4.1 Upload PDF Documents

Use the application's document upload feature, or via API:

```bash
curl -X POST https://your-app.workers.dev/api/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf" \
  -F "docType=paper"
```

### 4.2 Verify Data Import

Query database to verify:

```bash
npx wrangler d1 execute nano-rag-production-db --remote \
  --command "SELECT COUNT(*) FROM chunks"
```

## 5. Monitoring and Logs

### 5.1 View Real-time Logs

```bash
npx wrangler tail
```

### 5.2 View D1 Database Metrics

In Cloudflare Dashboard:
- Workers & Pages > nano-rag-production > Metrics

## 6. Common Issues

### Q: Deployment fails with database_id error
A: Ensure `wrangler.toml` has the correct production database ID

### Q: API returns "OPENAI_API_KEY not configured"
A: Check if environment variables are correctly set:
```bash
npx wrangler secret list
```

### Q: Database connection fails during local preview
A: Ensure:
1. `.dev.vars` file exists and is correctly configured
2. Local database migration has been executed: `npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql`

### Q: Vector retrieval results are empty
A: Check:
1. If database has data
2. If OpenAI API Key is valid
3. If embeddings are generated normally

### Q: Page returns 404
A: Ensure `wrangler.toml` has `[assets]` configuration:
```toml
[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

## 7. Rollback

If deployment has issues, you can rollback to a previous version:

```bash
# View deployment history
npx wrangler deployments list

# Rollback to specified version
npx wrangler rollback --version <version-id>
```

## 8. Security Recommendations

1. **API Key Management**
   - Use Wrangler secrets to store sensitive information
   - Regularly rotate API keys
   - Don't hardcode keys in code

2. **Access Control**
   - Consider adding authentication
   - Limit API call frequency
   - Monitor abnormal access

3. **Data Security**
   - Regularly backup D1 database
   - Implement data retention policies

## 9. Performance Optimization

1. **Database Optimization**
   - Regularly clean expired data
   - Monitor query performance

2. **Caching Strategy**
   - Use Cloudflare Cache API
   - Consider caching common query results

3. **Resource Limits**
   - Monitor Worker CPU and memory usage
   - Worker memory limit: Free 128MB, Paid 2GB
   - Package size limit: Free 1MB, Paid 10MB (compressed)

## 10. Related Links

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [OpenNext Cloudflare Documentation](https://opennext.js.org/cloudflare)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
