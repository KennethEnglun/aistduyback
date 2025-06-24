# LPMS AI學習平台 - Railway部署指南

## 🚀 快速部署到Railway

### 1. 準備工作
- 確保代碼已推送到GitHub倉庫：https://github.com/KennethEnglun/aistduyback.git
- 準備DeepSeek AI API Key

### 2. Railway部署步驟

#### 步驟1：創建Railway帳戶
1. 訪問 [Railway官網](https://railway.app/)
2. 使用GitHub帳戶註冊或登入

#### 步驟2：部署項目
1. 在Railway儀表板點擊 **"New Project"**
2. 選擇 **"Deploy from GitHub repo"**
3. 選擇 `aistduyback` 倉庫
4. Railway會自動檢測到Node.js項目並開始部署

#### 步驟3：設置環境變量
在項目設置中添加環境變量：

1. 點擊項目 → **"Variables"** 標籤
2. 添加以下變量：

| Variable Name | Value |
|---------------|--------|
| `NODE_ENV` | `production` |
| `DEEPSEEK_API_KEY` | `你的DeepSeek API Key` |

#### 步驟4：配置域名（可選）
1. 在項目設置中點擊 **"Settings"** → **"Domains"**
2. Railway會自動提供一個`.railway.app`域名
3. 也可以添加自定義域名

### 3. 部署特點

#### ✅ Railway優勢
- **自動部署**：推送到GitHub自動觸發部署
- **持久化存儲**：支持數據庫持久化（收費功能）
- **快速啟動**：比其他平台啟動更快
- **日誌監控**：實時查看應用日誌
- **免費額度**：每月500小時免費執行時間

#### 📊 資源限制（免費方案）
- **執行時間**：每月500小時
- **內存**：512MB RAM
- **存儲**：1GB磁盤空間
- **網路**：100GB流量

### 4. 部署後驗證

部署完成後，你會獲得一個Railway URL，格式如：
`https://your-project-name.railway.app`

**測試清單：**
- ✅ 主頁面正常加載
- ✅ 年級和科目選擇功能
- ✅ AI問題生成
- ✅ 答題流程
- ✅ 分數保存
- ✅ 排行榜顯示
- ✅ 學習歷史功能

### 5. 數據庫配置

#### 使用SQLite（當前配置）
- **注意**：SQLite數據庫會在每次部署時重置
- **適用於**：測試和演示環境

#### 升級到PostgreSQL（推薦生產環境）
1. 在Railway項目中添加PostgreSQL服務：
   - 點擊 **"New"** → **"Database"** → **"Add PostgreSQL"**
2. 修改server.js使用PostgreSQL連接
3. 安裝pg依賴：`npm install pg`

### 6. 監控和維護

#### 查看日誌
1. 在Railway項目中點擊 **"Deployments"**
2. 選擇最新部署查看實時日誌

#### 監控使用量
- 在項目概覽中查看資源使用情況
- 監控免費額度使用量

#### 自動重啟
- Railway會自動監控應用健康狀態
- 配置了失敗重啟策略（最多10次重試）

### 7. 高級配置

#### 自定義構建
如需自定義構建過程，可以修改`railway.json`：

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100
  }
}
```

#### 環境變量管理
```bash
# 使用Railway CLI管理變量
railway variables set NODE_ENV=production
railway variables set DEEPSEEK_API_KEY=your_key_here
```

### 8. 故障排除

#### 常見問題

1. **部署失敗**
   - 檢查package.json中的依賴
   - 查看部署日誌錯誤信息
   - 確認Node.js版本兼容性

2. **應用無法啟動**
   - 檢查環境變量設置
   - 確認start命令正確
   - 查看應用日誌

3. **數據庫錯誤**
   - SQLite文件權限問題
   - 考慮升級到PostgreSQL

4. **API調用失敗**
   - 檢查DeepSeek API Key
   - 確認網路連接
   - 查看API請求限制

#### 獲取幫助
- Railway官方文檔：https://docs.railway.app/
- 社區Discord：https://discord.gg/railway
- GitHub Issues

### 9. 成本優化

#### 免費方案限制
- 每月500小時執行時間
- 應用會在無活動後睡眠
- 適合個人項目和測試

#### 升級考慮
- 生產環境建議升級到付費方案
- 獲得持久化存儲
- 24/7運行不睡眠
- 更多資源配額

### 10. 部署流程圖

```
GitHub推送 → Railway自動檢測 → 構建應用 → 部署到雲端 → 分配域名 → 可用訪問
```

## 🔧 一鍵部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/6-jB8h)

點擊上方按鈕可直接部署此項目到Railway。 