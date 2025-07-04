# LPMS - LPedia AI溫習問答系統

一個基於AI的智能問答平台，專為小學生設計，提供個性化的學習體驗。

## 功能特色

- 🎯 **年級適應性**：支援一年級至六年級，AI會根據年級調整問題難度
- 📚 **多科目覆蓋**：包含中文、英文、數學、科學、人文五大科目  
- 🤖 **AI智能出題**：使用DeepSeek AI根據用戶輸入的主題生成相關問題
- ✅ **多選題模式**：主要採用多項選擇題形式，易於學習和評估
- 📊 **成績追蹤**：每套20題測驗完成後自動計分並記錄
- 🏆 **排行榜系統**：查看歷史成績和與其他用戶的比較
- 📈 **統計分析**：提供學習統計數據和分析

## 技術架構

### 後端
- **Node.js** + **Express.js** - 服務器框架
- **SQLite** - 數據庫存儲
- **DeepSeek AI API** - AI問題生成
- **CORS** - 跨域支持

### 前端
- **HTML5** - 頁面結構
- **CSS3** - 現代化UI設計
- **Vanilla JavaScript** - 交互邏輯
- **Font Awesome** - 圖標庫
- **Google Fonts** - 字體支持

## 安裝和運行

### 本地開發

#### 1. 克隆倉庫
```bash
git clone https://github.com/KennethEnglun/aistduyback.git
cd aistduyback
```

#### 2. 安裝依賴
```bash
npm install
```

#### 3. 啟動服務器
```bash
# 開發模式（需要先安裝 nodemon）
npm run dev

# 或者直接運行
npm start
```

#### 4. 訪問應用
打開瀏覽器，訪問 `http://localhost:3000`

### 🚀 部署到Railway

#### 快速部署
1. 在 [Railway](https://railway.app) 創建帳戶
2. 點擊 "New Project" → "Deploy from GitHub repo"
3. 選擇 GitHub 倉庫：`https://github.com/KennethEnglun/aistduyback.git`
4. Railway會自動檢測Node.js項目並開始部署
5. 在項目設置中添加環境變量：
   - `NODE_ENV`: `production`
   - `DEEPSEEK_API_KEY`: `你的API密鑰`
6. 部署完成後獲得Railway URL

#### 一鍵部署按鈕
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/KennethEnglun/aistduyback.git)

#### 詳細部署指南
請參閱 [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) 獲取完整的部署說明。

#### 在線演示
- **部署地址**：`https://your-project-name.railway.app`
- **GitHub倉庫**：https://github.com/KennethEnglun/aistduyback.git

## 使用說明

### 開始測驗
1. **選擇年級**：從一年級到六年級中選擇合適的年級
2. **選擇科目**：從中文、英文、數學、科學、人文中選擇科目
3. **輸入主題**：輸入想要學習的具體主題（如：加法、詩詞、動物等）
4. **開始測驗**：點擊開始測驗按鈕，AI會生成20道相關問題

### 答題過程
- 每道題目都是多項選擇題（A、B、C、D四個選項）
- 可以隨時返回上一題修改答案
- 進度條顯示當前答題進度
- 必須回答完所有問題才能進入下一題

### 查看結果
- 測驗完成後會顯示總分和百分比
- 成績會自動保存到數據庫
- 可以選擇重新開始或查看排行榜

### 排行榜和統計
- **排行榜**：查看所有用戶的測驗成績排名
- **統計**：查看總測驗次數和平均分數

## API 接口

### 生成問題
```
POST /api/generate-questions
Content-Type: application/json

{
  "grade": "三年級",
  "subject": "數學", 
  "topic": "加法"
}
```

### 保存分數
```
POST /api/save-score
Content-Type: application/json

{
  "grade": "三年級",
  "subject": "數學",
  "topic": "加法",
  "score": 18,
  "totalQuestions": 20
}
```

### 獲取排行榜
```
GET /api/leaderboard
```

### 獲取統計
```
GET /api/stats
```

## 數據庫結構

### scores 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵，自動遞增 |
| grade | TEXT | 年級 |
| subject | TEXT | 科目 |
| topic | TEXT | 學習主題 |
| score | INTEGER | 得分 |
| total_questions | INTEGER | 總題數 |
| timestamp | DATETIME | 測驗時間 |

## AI 配置

系統使用 DeepSeek AI API 來生成問題。AI會根據以下參數調整問題難度：

- **一年級**：適合6-7歲兒童，使用簡單詞彙和基礎概念
- **二年級**：適合7-8歲兒童，稍微複雜的概念但仍保持簡單
- **三年級**：適合8-9歲兒童，可以包含一些較複雜的概念
- **四年級**：適合9-10歲兒童，中等難度的概念和詞彙
- **五年級**：適合10-11歲兒童，較複雜的概念和推理
- **六年級**：適合11-12歲兒童，最複雜的小學階段概念

## 響應式設計

平台採用響應式設計，支持以下設備：
- 桌面電腦（1200px+）
- 平板電腦（768px-1199px）
- 手機（<768px）

## 瀏覽器支持

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 故障排除

### 常見問題

1. **AI生成問題失敗**
   - 檢查網絡連接
   - 確認DeepSeek API金鑰有效
   - 重試生成問題

2. **數據庫錯誤**
   - 確保有寫入權限
   - 檢查SQLite數據庫文件

3. **頁面無法載入**
   - 檢查服務器是否運行
   - 確認端口3000未被佔用

### 日誌查看
服務器控制台會顯示詳細的錯誤信息和操作日誌。

## 開發說明

### 項目結構
```
├── server.js          # 主服務器文件
├── package.json       # 項目配置和依賴
├── quiz_database.db   # SQLite數據庫（自動生成）
├── public/            # 前端文件目錄
│   ├── index.html     # 主頁面
│   ├── styles.css     # 樣式文件
│   └── script.js      # JavaScript邏輯
└── README.md          # 說明文件
```

### 添加新功能
1. 在 `server.js` 中添加新的API端點
2. 在 `script.js` 中添加前端邏輯
3. 在 `styles.css` 中添加樣式
4. 測試功能並更新文檔

## 版本信息

- **版本**：1.0.0
- **創建日期**：2024年
- **更新日期**：2024年

## 授權

本項目採用 MIT 授權條款。 