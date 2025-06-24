const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// DeepSeek AI 配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-c47eb9db749e4d0da072557681f52e83';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 檢查API密鑰配置
console.log('🔑 DeepSeek API配置檢查:');
console.log('📊 環境變量檢查:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- API Key存在:', !!process.env.DEEPSEEK_API_KEY);

if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'undefined') {
    console.error('❌ DeepSeek API Key 未設置或無效');
    console.error('🔍 當前環境變量中的API Key:', process.env.DEEPSEEK_API_KEY ? 'EXISTS' : 'NOT_FOUND');
} else {
    console.log('✅ DeepSeek API Key 已設置:', `${DEEPSEEK_API_KEY.substring(0, 10)}...`);
    console.log('🔍 Key長度:', DEEPSEEK_API_KEY.length);
}
console.log('🔗 API URL:', DEEPSEEK_API_URL);

// 初始化數據庫
const db = new sqlite3.Database('./quiz_database.db');

// 創建表格
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT DEFAULT '匿名用戶',
        grade TEXT NOT NULL,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        study_content TEXT,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // 創建學習內容歷史表
    db.run(`CREATE TABLE IF NOT EXISTS study_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade TEXT NOT NULL,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        study_content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// 年級和科目配置
const GRADES = ['一年級', '二年級', '三年級', '四年級', '五年級', '六年級'];
const SUBJECTS = ['中文', '英文', '數學', '科學', '人文'];

// 根據年級調整問題難度的提示
const getDifficultyPrompt = (grade) => {
    const gradeMap = {
        '一年級': '適合6-7歲兒童，使用極簡單詞彙，問題要像遊戲一樣有趣，數字計算不超過10，多用圖像化描述',
        '二年級': '適合7-8歲兒童，使用簡單詞彙，數字計算在10以內，問題要生活化且容易理解',
        '三年級': '適合8-9歲兒童，使用日常詞彙，數字計算不超過50，問題要貼近生活經驗',
        '四年級': '適合9-10歲兒童，使用常見詞彙，數字計算不超過100，概念要具體不抽象',
        '五年級': '適合10-11歲兒童，難度適中，概念清晰具體，避免複雜推理',
        '六年級': '適合11-12歲兒童，小學階段基礎難度，概念要實用且容易掌握'
    };
    return gradeMap[grade] || '適合小學生，使用最簡單易懂的語言，問題要非常容易';
};

// 根據科目獲取特定範圍提示
const getSubjectScope = (subject) => {
    if (subject === '人文') {
        return '主要涵蓋香港和中國的歷史、地理、文化、節日、名勝古蹟、重要人物等內容。';
    }
    return '';
};

// 保存學習內容到歷史
function saveStudyContent(grade, subject, topic, studyContent) {
    // 先檢查是否已存在相同內容（避免重複）
    db.get(
        'SELECT id FROM study_history WHERE grade = ? AND subject = ? AND topic = ? AND study_content = ? ORDER BY timestamp DESC LIMIT 1',
        [grade, subject, topic, studyContent],
        (err, row) => {
            if (err) {
                console.error('檢查學習內容歷史錯誤:', err);
                return;
            }
            
            // 如果不存在相同內容，則插入
            if (!row) {
                db.run(
                    'INSERT INTO study_history (grade, subject, topic, study_content) VALUES (?, ?, ?, ?)',
                    [grade, subject, topic, studyContent],
                    function(err) {
                        if (err) {
                            console.error('保存學習內容歷史錯誤:', err);
                            return;
                        }
                        
                        // 保持最近100條記錄
                        db.run(`
                            DELETE FROM study_history 
                            WHERE id NOT IN (
                                SELECT id FROM study_history 
                                ORDER BY timestamp DESC 
                                LIMIT 100
                            )
                        `);
                    }
                );
            }
        }
    );
}

// 生成問題的API
app.post('/api/generate-questions', async (req, res) => {
    try {
        const { grade, subject, topic, studyContent } = req.body;
        
        if (!GRADES.includes(grade) || !SUBJECTS.includes(subject)) {
            return res.status(400).json({ error: '無效的年級或科目' });
        }

        const difficultyLevel = getDifficultyPrompt(grade);
        const subjectScope = getSubjectScope(subject);
        
        let prompt;
        
        if (studyContent && studyContent.trim()) {
            // 保存學習內容到歷史（限制最近100條）
            saveStudyContent(grade, subject, topic, studyContent.trim());
            
            // 進階功能：基於詳細學習內容生成問題
            prompt = `請仔細閱讀以下學習內容，為${grade}學生生成10道${subject}科目的多項選擇題。

學習內容：
${studyContent}

要求：
1. 問題必須緊密圍繞上述學習內容出題
2. 難度：${difficultyLevel}
3. ${subjectScope}
4. 每題包含4個選項（A、B、C、D）
5. 只有一個正確答案
6. 問題要測試學生對學習內容的理解和記憶
7. 語言要簡單易懂，適合${grade}學生
8. 避免過於抽象或複雜的概念
9. 請以JSON格式回答，格式如下：

{
  "questions": [
    {
      "question": "問題內容",
      "options": {
        "A": "選項A",
        "B": "選項B", 
        "C": "選項C",
        "D": "選項D"
      },
      "correct_answer": "A"
    }
  ]
}

請確保回答是有效的JSON格式。`;
        } else {
            // 普通功能：基於主題生成問題
            prompt = `請為${grade}學生生成10道${subject}科目關於"${topic}"的多項選擇題。

要求：
1. 難度：${difficultyLevel}
2. ${subjectScope}
3. 每題包含4個選項（A、B、C、D）
4. 只有一個正確答案
5. 問題要與"${topic}"主題相關
6. 語言要簡單易懂，適合${grade}學生理解
7. 避免過於複雜的計算或抽象概念
8. 使用日常生活中的例子讓學生容易理解
9. 請以JSON格式回答，格式如下：

{
  "questions": [
    {
      "question": "問題內容",
      "options": {
        "A": "選項A",
        "B": "選項B", 
        "C": "選項C",
        "D": "選項D"
      },
      "correct_answer": "A"
    }
  ]
}

請確保回答是有效的JSON格式。`;
        }

        console.log('🚀 開始調用DeepSeek API...');
        console.log('📝 API Key前10位:', DEEPSEEK_API_KEY.substring(0, 10));
        
        const response = await axios.post(DEEPSEEK_API_URL, {
            model: "deepseek-chat",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 4000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60秒超時（Railway需要更長時間）
        });

        console.log('✅ API調用成功，狀態碼:', response.status);
        
        let content = response.data.choices[0].message.content;
        
        // 清理回應內容，移除可能的markdown格式
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let questions;
        try {
            questions = JSON.parse(content);
            console.log('✅ JSON解析成功，生成了', questions.questions?.length || 0, '道題目');
        } catch (parseError) {
            console.error('❌ JSON解析錯誤:', parseError);
            console.error('🔍 原始內容:', content);
            return res.status(500).json({ error: 'AI回應格式錯誤，請重試' });
        }

        res.json(questions);
    } catch (error) {
        console.error('❌ 生成問題錯誤:', error.message);
        
        // 詳細錯誤診斷
        if (error.response) {
            console.error('🔍 API響應錯誤:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
            
            if (error.response.status === 401) {
                return res.status(500).json({ error: 'API密鑰無效或已過期' });
            } else if (error.response.status === 429) {
                return res.status(500).json({ error: 'API調用頻率過高，請稍後重試' });
            } else if (error.response.status === 403) {
                return res.status(500).json({ error: 'API權限不足' });
            }
        } else if (error.request) {
            console.error('🔍 網路請求錯誤:', error.message);
            return res.status(500).json({ error: '網路連接失敗，請檢查網路連接' });
        } else if (error.code === 'ECONNABORTED') {
            console.error('🔍 請求超時錯誤');
            return res.status(500).json({ error: 'API調用超時，請重試' });
        }
        
        res.status(500).json({ error: '生成問題失敗：' + error.message });
    }
});

// 保存分數API
app.post('/api/save-score', (req, res) => {
    const { grade, subject, topic, score, totalQuestions, userName, studyContent } = req.body;
    
    db.run(
        'INSERT INTO scores (user_name, grade, subject, topic, study_content, score, total_questions) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userName || '匿名用戶', grade, subject, topic, studyContent || null, score, totalQuestions],
        function(err) {
            if (err) {
                console.error('保存分數錯誤:', err);
                return res.status(500).json({ error: '保存分數失敗' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 獲取排行榜API
app.get('/api/leaderboard', (req, res) => {
    const { grade, subject } = req.query;
    
    let query = `
        SELECT user_name, grade, subject, topic, score, total_questions, 
               ROUND((score * 100.0 / total_questions), 1) as percentage,
               timestamp
        FROM scores 
    `;
    
    let params = [];
    let whereConditions = [];
    
    if (grade) {
        whereConditions.push('grade = ?');
        params.push(grade);
    }
    
    if (subject) {
        whereConditions.push('subject = ?');
        params.push(subject);
    }
    
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY percentage DESC, timestamp DESC LIMIT 50';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('獲取排行榜錯誤:', err);
            return res.status(500).json({ error: '獲取排行榜失敗' });
        }
        res.json(rows);
    });
});

// 獲取統計數據API
app.get('/api/stats', (req, res) => {
    const { grade, subject } = req.query;
    
    let query = 'SELECT AVG(score * 100.0 / total_questions) as avg_score, COUNT(*) as total_attempts FROM scores';
    let params = [];
    
    if (grade || subject) {
        query += ' WHERE';
        if (grade) {
            query += ' grade = ?';
            params.push(grade);
        }
        if (subject) {
            if (grade) query += ' AND';
            query += ' subject = ?';
            params.push(subject);
        }
    }
    
    db.get(query, params, (err, row) => {
        if (err) {
            console.error('獲取統計錯誤:', err);
            return res.status(500).json({ error: '獲取統計失敗' });
        }
        res.json({
            averageScore: Math.round(row.avg_score || 0),
            totalAttempts: row.total_attempts || 0
        });
    });
});

// 健康檢查端點
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        apiKeyConfigured: !!DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'undefined',
        apiKeyLength: DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.length : 0,
        apiUrl: DEEPSEEK_API_URL
    });
});

// API狀態檢查端點
app.get('/api/status', (req, res) => {
    res.json({
        message: 'LPMS AI Quiz Platform API 正常運行',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/api/generate-questions',
            '/api/save-score', 
            '/api/leaderboard',
            '/api/stats',
            '/api/study-history'
        ]
    });
});

// 提供主頁面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 獲取學習內容歷史API
app.get('/api/study-history', (req, res) => {
    const { grade, subject } = req.query;
    
    let query = 'SELECT topic, study_content, timestamp FROM study_history';
    let params = [];
    
    if (grade && subject) {
        query += ' WHERE grade = ? AND subject = ?';
        params = [grade, subject];
    } else if (grade) {
        query += ' WHERE grade = ?';
        params = [grade];
    } else if (subject) {
        query += ' WHERE subject = ?';
        params = [subject];
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 20';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('獲取學習內容歷史錯誤:', err);
            return res.status(500).json({ error: '獲取歷史失敗' });
        }
        res.json(rows || []);
    });
});

// 啟動服務器
app.listen(PORT, () => {
    console.log(`LPMS AI問答平台運行在 http://localhost:${PORT}`);
});

// 優雅關閉
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('關閉數據庫錯誤:', err);
        } else {
            console.log('數據庫連接已關閉');
        }
        process.exit(0);
    });
}); 