#!/bin/bash

# Nano-RAG 端到端验收测试脚本
# 用法: ./scripts/e2e-test.sh [BASE_URL]

set -e

BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=10

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Nano-RAG 端到端验收测试"
echo "======================================"
echo "目标URL: $BASE_URL"
echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

run_test_verbose() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "测试 $TOTAL_TESTS: $test_name"
    
    if output=$(eval "$test_command" 2>&1); then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        if [ -n "$output" ]; then
            echo "$output" | sed 's/^/  /'
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ -n "$output" ]; then
            echo "$output" | sed 's/^/  /'
        fi
    fi
    echo ""
}

# ============================================
# 测试套件
# ============================================

echo "### 1. 基础连接测试"
echo ""

run_test "健康检查端点" \
    "curl -sf -X GET '$BASE_URL/api/health' --max-time $TIMEOUT"

echo ""
echo "### 2. 数据库连接测试"
echo ""

run_test_verbose "数据库连接" \
    "curl -sf -X GET '$BASE_URL/api/test-db' --max-time $TIMEOUT"

echo ""
echo "### 3. API 端点可用性测试"
echo ""

run_test "聊天 API 端点响应" \
    "curl -sf -X POST '$BASE_URL/api/chat' \
    -H 'Content-Type: application/json' \
    -d '{\"question\":\"test\"}' \
    --max-time $TIMEOUT || true"

echo ""
echo "### 4. 前端页面测试"
echo ""

run_test "主页可访问" \
    "curl -sf -X GET '$BASE_URL/' --max-time $TIMEOUT"

run_test "文档页面可访问" \
    "curl -sf -X GET '$BASE_URL/documents' --max-time $TIMEOUT"

run_test "历史页面可访问" \
    "curl -sf -X GET '$BASE_URL/history' --max-time $TIMEOUT"

echo ""
echo "### 5. 性能测试"
echo ""

run_test "主页响应时间 < 2秒" \
    "[ \$(curl -sf -X GET '$BASE_URL/' -w '%{time_total}' --max-time 2 -o /dev/null | awk '{printf \"%.0f\", \$1 * 1000}') -lt 2000 ]"

echo ""
echo "### 6. 错误处理测试"
echo ""

run_test "无效 JSON 处理" \
    "curl -sf -X POST '$BASE_URL/api/chat' \
    -H 'Content-Type: application/json' \
    -d 'invalid json' \
    --max-time $TIMEOUT || true"

run_test "缺少参数处理" \
    "curl -sf -X POST '$BASE_URL/api/chat' \
    -H 'Content-Type: application/json' \
    -d '{}' \
    --max-time $TIMEOUT || true"

echo ""
echo "### 7. LangGraph 流程测试"
echo ""

run_test_verbose "LangGraph 流程测试" \
    "curl -sf -X GET '$BASE_URL/api/test-langgraph' --max-time $TIMEOUT"

echo ""
echo "======================================"
echo "测试汇总"
echo "======================================"
echo -e "总计: $TOTAL_TESTS 个测试"
echo -e "${GREEN}通过: $PASSED_TESTS 个${NC}"
echo -e "${RED}失败: $FAILED_TESTS 个${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi
