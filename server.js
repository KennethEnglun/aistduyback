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

// Moonshot AI 配置
let MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || 'sk-vk1i7KpqLdUssyl9gEPb4CHz5ZxKpb60A1EpTuMzwPYyu6U4';
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 清理API Key - 移除可能的無效字符
MOONSHOT_API_KEY = MOONSHOT_API_KEY.trim().replace(/[\r\n\t]/g, '');

// 檢查API密鑰配置
console.log('🔑 Moonshot AI API配置檢查:');
console.log('📊 環境變量檢查:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- API Key存在:', !!process.env.MOONSHOT_API_KEY);
console.log('- 原始API Key長度:', process.env.MOONSHOT_API_KEY ? process.env.MOONSHOT_API_KEY.length : 0);

if (!MOONSHOT_API_KEY || MOONSHOT_API_KEY === 'undefined') {
    console.error('❌ Moonshot AI API Key 未設置或無效');
    console.error('🔍 當前環境變量中的API Key:', process.env.MOONSHOT_API_KEY ? 'EXISTS' : 'NOT_FOUND');
} else {
    console.log('✅ Moonshot AI API Key 已設置:', `${MOONSHOT_API_KEY.substring(0, 10)}...`);
    console.log('🔍 清理後Key長度:', MOONSHOT_API_KEY.length);
    console.log('🔍 Key格式檢查:', MOONSHOT_API_KEY.startsWith('sk-') ? '✅ 正確格式' : '❌ 格式錯誤');
    
    // 檢查是否有特殊字符
    const hasSpecialChars = /[^\w-]/.test(MOONSHOT_API_KEY.replace('sk-', ''));
    console.log('🔍 特殊字符檢查:', hasSpecialChars ? '❌ 含有特殊字符' : '✅ 無特殊字符');
}
console.log('🔗 API URL:', MOONSHOT_API_URL);

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
        questions_data TEXT,
        user_answers TEXT,
        question_type TEXT DEFAULT 'multiple_choice',
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
    
    // 添加新欄位到現有的scores表（如果不存在）
    db.run(`ALTER TABLE scores ADD COLUMN questions_data TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('添加questions_data欄位錯誤:', err);
        }
    });
    
    db.run(`ALTER TABLE scores ADD COLUMN user_answers TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('添加user_answers欄位錯誤:', err);
        }
    });
    
    db.run(`ALTER TABLE scores ADD COLUMN question_type TEXT DEFAULT 'multiple_choice'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('添加question_type欄位錯誤:', err);
        }
    });
    
    // 創建預設題目表
    db.run(`CREATE TABLE IF NOT EXISTS presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade TEXT NOT NULL,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        study_content TEXT,
        question_type TEXT NOT NULL,
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
        const { grade, subject, topic, studyContent, questionType } = req.body;
        
        if (!GRADES.includes(grade) || !SUBJECTS.includes(subject)) {
            return res.status(400).json({ error: '無效的年級或科目' });
        }

        const difficultyLevel = getDifficultyPrompt(grade);
        const subjectScope = getSubjectScope(subject);
        
        let prompt;
        const isShortAnswer = questionType === 'short_answer';
        const questionTypeText = isShortAnswer ? '短答題' : '多項選擇題';
        
        if (studyContent && studyContent.trim()) {
            // 保存學習內容到歷史（限制最近100條）
            saveStudyContent(grade, subject, topic, studyContent.trim());
            
            // 進階功能：基於詳細學習內容生成問題
            prompt = `請仔細閱讀以下學習內容，為${grade}學生生成10道${subject}科目的${questionTypeText}。

學習內容：
${studyContent}

要求：
1. 問題必須緊密圍繞上述學習內容出題
2. 難度：${difficultyLevel}
3. ${subjectScope}
${isShortAnswer ? 
`4. 每題要求學生用簡短文字回答
5. 答案應該簡潔明確，適合${grade}學生表達
6. 問題要測試學生對學習內容的理解和記憶
7. 語言要簡單易懂，適合${grade}學生
8. 避免過於抽象或複雜的概念
9. 必須使用繁體中文（Traditional Chinese）出題，不可使用簡體中文
10. 所有題目、答案和內容都必須是繁體中文
11. 請以JSON格式回答，格式如下：

{
  "questions": [
    {
      "question": "問題內容",
      "correct_answer": "標準答案",
      "type": "short_answer"
    }
  ]
}` :
`4. 每題包含4個選項（A、B、C、D）
5. 只有一個正確答案
6. 問題要測試學生對學習內容的理解和記憶
7. 語言要簡單易懂，適合${grade}學生
8. 避免過於抽象或複雜的概念
9. 必須使用繁體中文（Traditional Chinese）出題，不可使用簡體中文
10. 所有題目、選項和內容都必須是繁體中文
11. 請以JSON格式回答，格式如下：

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
      "correct_answer": "A",
      "type": "multiple_choice"
    }
  ]
}`}

請確保回答是有效的JSON格式。`;
        } else {
            // 普通功能：基於主題生成問題
            prompt = `請為${grade}學生生成10道${subject}科目關於"${topic}"的${questionTypeText}。

要求：
1. 難度：${difficultyLevel}
2. ${subjectScope}
${isShortAnswer ?
`3. 每題要求學生用簡短文字回答
4. 答案應該簡潔明確，適合${grade}學生表達
5. 問題要與"${topic}"主題相關
6. 語言要簡單易懂，適合${grade}學生理解
7. 避免過於複雜的計算或抽象概念
8. 使用日常生活中的例子讓學生容易理解
9. 必須使用繁體中文（Traditional Chinese）出題，不可使用簡體中文
10. 所有題目、答案和內容都必須是繁體中文
11. 請以JSON格式回答，格式如下：

{
  "questions": [
    {
      "question": "問題內容",
      "correct_answer": "標準答案",
      "type": "short_answer"
    }
  ]
}` :
`3. 每題包含4個選項（A、B、C、D）
4. 只有一個正確答案
5. 問題要與"${topic}"主題相關
6. 語言要簡單易懂，適合${grade}學生理解
7. 避免過於複雜的計算或抽象概念
8. 使用日常生活中的例子讓學生容易理解
9. 必須使用繁體中文（Traditional Chinese）出題，不可使用簡體中文
10. 所有題目、選項和內容都必須是繁體中文
11. 請以JSON格式回答，格式如下：

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
      "correct_answer": "A",
      "type": "multiple_choice"
    }
  ]
}`}

請確保回答是有效的JSON格式。`;
        }

        console.log('🚀 開始調用Moonshot AI API...');
        console.log('📝 年級:', grade, '科目:', subject, '主題:', topic);
        console.log('🔑 API Key前10位:', MOONSHOT_API_KEY.substring(0, 10));
        console.log('📏 提示內容長度:', prompt.length, '字符');
        
        const requestPayload = {
            model: "moonshot-v1-8k",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 4000,
            temperature: 0.7
        };

        // 清理API Key並安全構建Authorization頭部
        const cleanKey = MOONSHOT_API_KEY.replace(/[^\w-]/g, '');
        const finalKey = cleanKey !== MOONSHOT_API_KEY ? cleanKey : MOONSHOT_API_KEY;
        const authHeader = `Bearer ${finalKey}`.trim();
        console.log('🔍 使用Authorization頭部長度:', authHeader.length);

        const requestConfig = {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'User-Agent': 'LPMS-Quiz-Platform/1.0'
            },
            timeout: 60000 // 60秒超時（Railway需要更長時間）
        };

        console.log('📤 發送請求到:', MOONSHOT_API_URL);
        const response = await axios.post(MOONSHOT_API_URL, requestPayload, requestConfig);

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
    const { grade, subject, topic, score, totalQuestions, userName, studyContent, questionsData, userAnswers, questionType } = req.body;
    
    // 添加詳細的調試日誌
    console.log('📝 保存分數請求:', {
        userName: userName || '匿名用戶',
        grade,
        subject,
        topic,
        score,
        totalQuestions,
        questionType: questionType || 'multiple_choice'
    });
    
    // 檢查必要欄位
    if (!grade || !subject || !topic) {
        console.error('❌ 缺少必要欄位:', { grade, subject, topic });
        return res.status(400).json({ error: '缺少必要欄位：年級、科目或主題' });
    }
    
    db.run(
        'INSERT INTO scores (user_name, grade, subject, topic, study_content, score, total_questions, questions_data, user_answers, question_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            userName || '匿名用戶', 
            grade, 
            subject, 
            topic, 
            studyContent || null, 
            score, 
            totalQuestions,
            questionsData ? JSON.stringify(questionsData) : null,
            userAnswers ? JSON.stringify(userAnswers) : null,
            questionType || 'multiple_choice'
        ],
        function(err) {
            if (err) {
                console.error('❌ 保存分數錯誤:', err);
                return res.status(500).json({ error: '保存分數失敗' });
            }
            console.log('✅ 分數保存成功，ID:', this.lastID);
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 獲取排行榜API
app.get('/api/leaderboard', (req, res) => {
    const { grade, subject } = req.query;
    
    console.log('🏆 獲取排行榜請求:', { grade, subject });
    
    let query = `
        SELECT id, user_name, grade, subject, topic, score, total_questions, 
               ROUND((score * 100.0 / total_questions), 1) as percentage,
               timestamp, questions_data, user_answers, question_type
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
    
    console.log('🔍 執行查詢:', query, 'params:', params);
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('❌ 獲取排行榜錯誤:', err);
            return res.status(500).json({ error: '獲取排行榜失敗' });
        }
        console.log('✅ 排行榜查詢成功，返回', rows.length, '條記錄');
        res.json(rows);
    });
});

// 獲取問答歷史詳情API
app.get('/api/quiz-history/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(
        'SELECT * FROM scores WHERE id = ?',
        [id],
        (err, row) => {
            if (err) {
                console.error('獲取問答歷史錯誤:', err);
                return res.status(500).json({ error: '獲取問答歷史失敗' });
            }
            
            if (!row) {
                return res.status(404).json({ error: '問答記錄不存在' });
            }
            
            // 解析JSON資料
            try {
                if (row.questions_data) {
                    row.questions_data = JSON.parse(row.questions_data);
                }
                if (row.user_answers) {
                    row.user_answers = JSON.parse(row.user_answers);
                }
            } catch (parseError) {
                console.error('解析問答資料錯誤:', parseError);
                return res.status(500).json({ error: '問答資料格式錯誤' });
            }
            
            res.json(row);
        }
    );
});

// 短答題AI評分API
app.post('/api/grade-short-answer', async (req, res) => {
    try {
        const { question, userAnswer, correctAnswer, grade, subject } = req.body;
        
        if (!question || !userAnswer || !correctAnswer) {
            return res.status(400).json({ error: '缺少必要參數' });
        }
        
        // 構建AI評分提示詞
        const gradingPrompt = `請作為一位${grade}的${subject}老師，評分以下短答題：

問題：${question}
標準答案：${correctAnswer}
學生答案：${userAnswer}

請仔細分析學生答案是否正確。評分標準：
1. 如果學生答案在語義上與標準答案相符，即使用詞不同，也應該算對
2. 如果學生答案包含標準答案的核心概念，應該算對
3. 如果學生答案完全錯誤或偏離主題，應該算錯
4. 考慮${grade}學生的表達能力和理解水平

請以JSON格式回答：
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "評分理由和建議",
  "reasoning": "詳細分析過程"
}

請確保回答是有效的JSON格式。`;
        
        const requestPayload = {
            model: "moonshot-v1-8k",
            messages: [
                {
                    role: "user",
                content: gradingPrompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.3
        };
        
        const cleanKey = MOONSHOT_API_KEY.replace(/[^\w-]/g, '');
        const finalKey = cleanKey !== MOONSHOT_API_KEY ? cleanKey : MOONSHOT_API_KEY;
        const authHeader = `Bearer ${finalKey}`.trim();
        
        const response = await axios.post(MOONSHOT_API_URL, requestPayload, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'User-Agent': 'LPMS-Quiz-Platform/1.0'
            },
            timeout: 30000
        });
        
        let content = response.data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let gradingResult;
        try {
            gradingResult = JSON.parse(content);
        } catch (parseError) {
            console.error('AI評分回應解析錯誤:', parseError);
            return res.status(500).json({ error: 'AI評分失敗，請重試' });
        }
        
        res.json(gradingResult);
        
    } catch (error) {
        console.error('短答題評分錯誤:', error.message);
        res.status(500).json({ error: '評分失敗：' + error.message });
    }
});

// 獲取所有預設題目API
app.get('/api/presets', (req, res) => {
    db.all('SELECT * FROM presets ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) {
            console.error('獲取預設題目錯誤:', err);
            return res.status(500).json({ error: '獲取預設題目失敗' });
        }
        res.json(rows);
    });
});

// 創建預設題目API
app.post('/api/presets', (req, res) => {
    const { grade, subject, topic, study_content, question_type } = req.body;
    
    if (!grade || !subject || !topic || !question_type) {
        return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    db.run(
        'INSERT INTO presets (grade, subject, topic, study_content, question_type) VALUES (?, ?, ?, ?, ?)',
        [grade, subject, topic, study_content || '', question_type],
        function(err) {
            if (err) {
                console.error('創建預設題目錯誤:', err);
                return res.status(500).json({ error: '創建預設題目失敗' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 刪除預設題目API
app.delete('/api/presets/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM presets WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('刪除預設題目錯誤:', err);
            return res.status(500).json({ error: '刪除預設題目失敗' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: '找不到要刪除的題目' });
        }
        res.json({ success: true });
    });
});

// 簡化版管理員登入API
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = '512524'; // 管理員密碼
    
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: '登入成功' });
    } else {
        res.status(401).json({ success: false, message: '密碼錯誤' });
    }
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
        apiKeyConfigured: !!MOONSHOT_API_KEY && MOONSHOT_API_KEY !== 'undefined',
        apiKeyLength: MOONSHOT_API_KEY ? MOONSHOT_API_KEY.length : 0,
        originalApiKeyLength: process.env.MOONSHOT_API_KEY ? process.env.MOONSHOT_API_KEY.length : 0,
        apiKeyStartsWithSk: MOONSHOT_API_KEY ? MOONSHOT_API_KEY.startsWith('sk-') : false,
        apiUrl: MOONSHOT_API_URL
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
            '/api/study-history',
            '/api/test-moonshot'
        ]
    });
});

// Moonshot AI API測試端點
app.get('/api/test-moonshot', async (req, res) => {
    try {
        console.log('🧪 開始測試Moonshot AI API...');
        
        const testPayload = {
            model: "moonshot-v1-8k",
            messages: [
                {
                    role: "user",
                    content: "請回答：1+1等於多少？請用JSON格式回答：{\"answer\": \"2\"}"
                }
            ],
            max_tokens: 100,
            temperature: 0.1
        };

        console.log('📤 發送測試請求到Moonshot AI...');
        console.log('🔑 使用API Key:', `${MOONSHOT_API_KEY.substring(0, 10)}...`);
        console.log('🔍 API Key長度:', MOONSHOT_API_KEY.length);
        console.log('🔍 API Key格式:', MOONSHOT_API_KEY.startsWith('sk-') ? '正確' : '錯誤');
        
        // 檢查API Key是否有問題字符
        const cleanKey = MOONSHOT_API_KEY.replace(/[^\w-]/g, '');
        const hasInvalidChars = cleanKey !== MOONSHOT_API_KEY;
        console.log('🔍 API Key有無效字符:', hasInvalidChars);
        if (hasInvalidChars) {
            console.log('🔧 原始Key前20字符:', JSON.stringify(MOONSHOT_API_KEY.substring(0, 20)));
            console.log('🔧 清理後Key前20字符:', JSON.stringify(cleanKey.substring(0, 20)));
        }
        
        // 使用清理後的Key構建Authorization頭部
        const finalKey = hasInvalidChars ? cleanKey : MOONSHOT_API_KEY;
        const authHeader = `Bearer ${finalKey}`.trim();
        console.log('🔍 Authorization頭部長度:', authHeader.length);
        
        const response = await axios.post(MOONSHOT_API_URL, testPayload, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'User-Agent': 'LPMS/1.0'
            },
            timeout: 30000
        });

        console.log('✅ Moonshot AI API測試成功');
        console.log('📥 回應狀態:', response.status);
        console.log('📄 回應內容:', response.data.choices[0].message.content);

        res.json({
            success: true,
            message: 'Moonshot AI API測試成功',
            response: {
                status: response.status,
                content: response.data.choices[0].message.content,
                usage: response.data.usage
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Moonshot AI API測試失敗:', error.message);
        
        let errorDetails = {
            message: error.message,
            timestamp: new Date().toISOString()
        };

        if (error.response) {
            console.error('🔍 API響應錯誤:', error.response.status, error.response.statusText);
            console.error('📋 錯誤詳情:', error.response.data);
            errorDetails.apiError = {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            };
        } else if (error.request) {
            console.error('🔍 網路請求錯誤');
            errorDetails.networkError = true;
        } else if (error.code === 'ECONNABORTED') {
            console.error('🔍 請求超時');
            errorDetails.timeout = true;
        }

        res.status(500).json({
            success: false,
            message: 'Moonshot AI API測試失敗',
            error: errorDetails
        });
    }
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
