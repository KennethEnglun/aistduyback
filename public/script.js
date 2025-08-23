// 全局變量
let selectedGrade = '';
let selectedSubject = '';
let selectedTopic = '';
let selectedMode = 'simple';
let selectedQuestionType = 'multiple_choice';
let studyContent = '';
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let answerConfirmed = [];
let score = 0;
let userName = '';

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化應用
function initializeApp() {
    setupEventListeners();
    showSection('home');
    loadLeaderboard();
    loadStats();
}

// 設置事件監聽器
function setupEventListeners() {
    // 年級選擇
    const gradeButtons = document.querySelectorAll('.grade-btn');
    gradeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            selectGrade(this.dataset.grade);
        });
    });

    // 科目選擇
    const subjectButtons = document.querySelectorAll('.subject-btn');
    subjectButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            selectSubject(this.dataset.subject);
        });
    });

    // 主題輸入
    const topicInput = document.getElementById('topic');
    topicInput.addEventListener('input', function() {
        updateTopicDisplay();
    });

    topicInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startQuiz();
        }
    });

    // 進階模式主題輸入
    const topicAdvancedInput = document.getElementById('topic-advanced');
    topicAdvancedInput.addEventListener('input', function() {
        updateTopicDisplay();
    });

    topicAdvancedInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startQuiz();
        }
    });

    // 學習內容輸入
    const studyContentInput = document.getElementById('study-content');
    studyContentInput.addEventListener('input', function() {
        studyContent = this.value.trim();
        updateSelectionSummary();
    });
}

// 顯示指定區段
function showSection(sectionName) {
    // 隱藏所有區段
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // 更新導航按鈕狀態
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // 顯示指定區段
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 更新對應的導航按鈕
    const targetNavBtn = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (targetNavBtn) {
        targetNavBtn.classList.add('active');
    }

    // 特殊處理
    if (sectionName === 'leaderboard') {
        loadLeaderboard();
    } else if (sectionName === 'stats') {
        loadStats();
    }
}

// 選擇年級
function selectGrade(grade) {
    selectedGrade = grade;
    
    // 更新按鈕狀態
    const gradeButtons = document.querySelectorAll('.grade-btn');
    gradeButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedBtn = document.querySelector(`[data-grade="${grade}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }

    // 顯示科目選擇
    document.getElementById('subject-selection').style.display = 'block';
    
    // 更新選擇總結
    updateSelectionSummary();
}

// 選擇科目
function selectSubject(subject) {
    selectedSubject = subject;
    
    // 更新按鈕狀態
    const subjectButtons = document.querySelectorAll('.subject-btn');
    subjectButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const selectedBtn = document.querySelector(`[data-subject="${subject}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }

    // 顯示主題輸入
    document.getElementById('topic-input').style.display = 'block';
    
    // 更新選擇總結
    updateSelectionSummary();
}

// 選擇模式
function selectMode(mode) {
    selectedMode = mode;
    
    // 更新按鈕狀態
    document.getElementById('simple-mode-btn').classList.remove('active');
    document.getElementById('advanced-mode-btn').classList.remove('active');
    document.getElementById(`${mode}-mode-btn`).classList.add('active');
    
    // 顯示對應的輸入區域
    document.getElementById('simple-mode').style.display = mode === 'simple' ? 'block' : 'none';
    document.getElementById('advanced-mode').style.display = mode === 'advanced' ? 'block' : 'none';
    
    updateTopicDisplay();
}

// 選擇題目類型
function selectQuestionType(type) {
    selectedQuestionType = type;
    
    // 更新按鈕狀態
    document.getElementById('multiple-choice-btn').classList.remove('active');
    document.getElementById('short-answer-btn').classList.remove('active');
    document.getElementById(`${type.replace('_', '-')}-btn`).classList.add('active');
    
    updateSelectionSummary();
}

// 更新主題顯示
function updateTopicDisplay() {
    if (selectedMode === 'simple') {
        const topicInput = document.getElementById('topic');
        selectedTopic = topicInput.value.trim();
    } else {
        const topicAdvancedInput = document.getElementById('topic-advanced');
        selectedTopic = topicAdvancedInput.value.trim();
        studyContent = document.getElementById('study-content').value.trim();
    }
    updateSelectionSummary();
}

// 更新選擇總結
function updateSelectionSummary() {
    const summaryDiv = document.getElementById('selection-summary');
    
    if (selectedGrade && selectedSubject) {
        summaryDiv.style.display = 'block';
        document.getElementById('selected-grade').textContent = selectedGrade;
        document.getElementById('selected-subject').textContent = selectedSubject;
        document.getElementById('selected-topic').textContent = selectedTopic || '尚未輸入';
    } else {
        summaryDiv.style.display = 'none';
    }
}

// 開始測驗
async function startQuiz() {
    if (!selectedGrade || !selectedSubject || !selectedTopic.trim()) {
        alert('請完成所有選擇！');
        return;
    }

    if (selectedMode === 'advanced' && !studyContent.trim()) {
        alert('進階模式需要輸入詳細學習內容！');
        return;
    }

    // 顯示載入畫面
    showLoading(true);

    try {
        // 發送請求生成問題
        const requestBody = {
            grade: selectedGrade,
            subject: selectedSubject,
            topic: selectedTopic,
            questionType: selectedQuestionType
        };

        if (selectedMode === 'advanced' && studyContent.trim()) {
            requestBody.studyContent = studyContent;
        }

        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('生成問題失敗');
        }

        const data = await response.json();
        questions = data.questions;
        
        if (!questions || questions.length === 0) {
            throw new Error('未能生成有效問題');
        }

        // 初始化測驗狀態
        currentQuestionIndex = 0;
        userAnswers = new Array(questions.length).fill(null);
        answerConfirmed = new Array(questions.length).fill(false);
        score = 0;

        // 顯示測驗頁面
        showSection('quiz');
        setupQuizDisplay();
        displayQuestion();

    } catch (error) {
        console.error('開始測驗錯誤:', error);
        alert('生成問題時發生錯誤，請重試！');
    } finally {
        showLoading(false);
    }
}

// 設置測驗顯示
function setupQuizDisplay() {
    document.getElementById('quiz-grade').textContent = selectedGrade;
    document.getElementById('quiz-subject').textContent = selectedSubject;
    document.getElementById('quiz-topic').textContent = selectedTopic;
}

// 顯示問題
function displayQuestion() {
    if (currentQuestionIndex >= questions.length) {
        finishQuiz();
        return;
    }

    const question = questions[currentQuestionIndex];
    
    // 更新進度
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${currentQuestionIndex + 1} / ${questions.length}`;

    // 顯示問題
    document.getElementById('question-text').textContent = question.question;

    // 生成選項或輸入框
    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';

    if (selectedQuestionType === 'short_answer' || question.type === 'short_answer') {
        // 短答題：顯示文字輸入框
        const answerInput = document.createElement('textarea');
        answerInput.className = 'short-answer-input';
        answerInput.placeholder = '請在此輸入您的答案...';
        answerInput.rows = 4;
        answerInput.maxLength = 200;
        
        if (userAnswers[currentQuestionIndex]) {
            answerInput.value = userAnswers[currentQuestionIndex];
        }
        
        answerInput.addEventListener('input', () => {
            userAnswers[currentQuestionIndex] = answerInput.value.trim();
            updateControlButtons();
        });
        
        optionsGrid.appendChild(answerInput);
        
        // 添加字數提示
        const charCount = document.createElement('div');
        charCount.className = 'char-count-display';
        charCount.textContent = `字數：${answerInput.value.length} / 200`;
        
        answerInput.addEventListener('input', () => {
            charCount.textContent = `字數：${answerInput.value.length} / 200`;
        });
        
        optionsGrid.appendChild(charCount);
        
    } else {
        // 多項選擇題：顯示選項按鈕
        Object.entries(question.options).forEach(([key, value]) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'option-btn';
            optionBtn.textContent = `${key}. ${value}`;
            optionBtn.addEventListener('click', () => selectOption(key));
            optionsGrid.appendChild(optionBtn);
        });
    }

    // 如果用戶之前選過答案，恢復選擇狀態
    if (userAnswers[currentQuestionIndex]) {
        if (selectedQuestionType === 'short_answer' || question.type === 'short_answer') {
            const answerInput = document.querySelector('.short-answer-input');
            if (answerInput) {
                answerInput.value = userAnswers[currentQuestionIndex];
            }
        } else {
            const optionButtons = document.querySelectorAll('.option-btn');
            const selectedOptionKey = userAnswers[currentQuestionIndex];
            optionButtons.forEach((btn, index) => {
                const optionKey = String.fromCharCode(65 + index); // A, B, C, D
                if (optionKey === selectedOptionKey) {
                    btn.classList.add('selected');
                }
            });
        }
    }

    // 如果答案已確認，恢復確認狀態
    if (answerConfirmed[currentQuestionIndex]) {
        if (selectedQuestionType === 'short_answer' || question.type === 'short_answer') {
            const answerInput = document.querySelector('.short-answer-input');
            if (answerInput) {
                answerInput.disabled = true;
                answerInput.classList.add('disabled');
            }
        } else {
            const optionButtons = document.querySelectorAll('.option-btn');
            optionButtons.forEach(btn => {
                btn.classList.add('disabled');
            });
            
            // 標記正確和錯誤選項
            const correctAnswer = questions[currentQuestionIndex].correct_answer;
            const userAnswer = userAnswers[currentQuestionIndex];
            
            optionButtons.forEach((btn, index) => {
                const optionKey = String.fromCharCode(65 + index);
                
                if (optionKey === correctAnswer) {
                    btn.classList.add('correct');
                } else if (optionKey === userAnswer && userAnswer !== correctAnswer) {
                    btn.classList.add('incorrect');
                }
            });
        }
        
        showAnswerExplanation();
    } else {
        // 隱藏答案解析
        document.getElementById('answer-explanation').style.display = 'none';
    }

    // 更新控制按鈕
    updateControlButtons();
}

// 選擇選項
function selectOption(option) {
    // 如果答案已確認，不允許再次選擇
    if (answerConfirmed[currentQuestionIndex]) {
        return;
    }

    userAnswers[currentQuestionIndex] = option;
    
    // 更新視覺狀態
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach((btn, index) => {
        btn.classList.remove('selected');
        // 檢查是否是被選中的選項
        const optionKey = String.fromCharCode(65 + index); // A, B, C, D
        if (optionKey === option) {
            btn.classList.add('selected');
        }
    });

    // 更新控制按鈕
    updateControlButtons();
}

// 獲取選項索引
function getOptionIndex(option) {
    const options = ['A', 'B', 'C', 'D'];
    return options.indexOf(option) + 1;
}

// 更新控制按鈕
function updateControlButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const nextBtn = document.getElementById('next-btn');

    // 上一題按鈕
    prevBtn.disabled = currentQuestionIndex === 0;

    const currentQuestion = questions[currentQuestionIndex];
    const isShortAnswer = selectedQuestionType === 'short_answer' || currentQuestion.type === 'short_answer';
    
    let hasAnswer;
    if (isShortAnswer) {
        hasAnswer = userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex].trim() !== '';
    } else {
        hasAnswer = userAnswers[currentQuestionIndex] !== null;
    }
    
    const isConfirmed = answerConfirmed[currentQuestionIndex];

    if (isConfirmed) {
        // 答案已確認，顯示下一題按鈕
        confirmBtn.style.display = 'none';
        nextBtn.style.display = 'block';
        nextBtn.disabled = false;
        
        // 更新按鈕文字
        if (currentQuestionIndex === questions.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-check"></i> 完成測驗';
        } else {
            nextBtn.innerHTML = '下一題 <i class="fas fa-chevron-right"></i>';
        }
    } else {
        // 答案未確認，顯示確認按鈕
        confirmBtn.style.display = 'block';
        nextBtn.style.display = 'none';
        confirmBtn.disabled = !hasAnswer;
    }
}

// 確認答案
async function confirmAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    const isShortAnswer = selectedQuestionType === 'short_answer' || currentQuestion.type === 'short_answer';
    
    if (isShortAnswer) {
        if (!userAnswers[currentQuestionIndex] || userAnswers[currentQuestionIndex].trim() === '') {
            alert('請輸入您的答案！');
            return;
        }
        
        // 顯示載入狀態
        const confirmBtn = document.getElementById('confirm-btn');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI評分中...';
        confirmBtn.disabled = true;
        
        try {
            // 調用AI評分API
            const response = await fetch('/api/grade-short-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: currentQuestion.question,
                    userAnswer: userAnswers[currentQuestionIndex],
                    correctAnswer: currentQuestion.correct_answer,
                    grade: selectedGrade,
                    subject: selectedSubject
                })
            });
            
            if (!response.ok) {
                throw new Error('AI評分失敗');
            }
            
            const gradingResult = await response.json();
            
            // 將AI評分結果存儲到問題中
            currentQuestion.aiGrading = gradingResult;
            
            // 標記答案已確認
            answerConfirmed[currentQuestionIndex] = true;
            
            // 顯示正確答案和解析
            showAnswerExplanation();
            
            // 禁用文字輸入框
            const answerInput = document.querySelector('.short-answer-input');
            if (answerInput) {
                answerInput.disabled = true;
                answerInput.classList.add('disabled');
            }
            
        } catch (error) {
            console.error('AI評分錯誤:', error);
            alert('AI評分失敗，請重試！');
            // 恢復按鈕狀態
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
            return;
        } finally {
            // 恢復按鈕狀態
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
        
    } else {
        if (userAnswers[currentQuestionIndex] === null) {
            alert('請選擇一個答案！');
            return;
        }
        
        // 標記答案已確認
        answerConfirmed[currentQuestionIndex] = true;
        
        // 顯示正確答案和解析
        showAnswerExplanation();
        
        // 禁用所有選項按鈕
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(btn => {
            btn.classList.add('disabled');
        });
        
        // 標記正確和錯誤選項
        const correctAnswer = questions[currentQuestionIndex].correct_answer;
        const userAnswer = userAnswers[currentQuestionIndex];
        
        optionButtons.forEach((btn, index) => {
            const optionKey = String.fromCharCode(65 + index); // A, B, C, D
            
            if (optionKey === correctAnswer) {
                btn.classList.add('correct');
            } else if (optionKey === userAnswer && userAnswer !== correctAnswer) {
                btn.classList.add('incorrect');
            }
        });
    }
    
    // 更新控制按鈕
    updateControlButtons();
}

// 顯示答案解析
function showAnswerExplanation() {
    const explanationDiv = document.getElementById('answer-explanation');
    const resultIndicator = document.getElementById('result-indicator');
    const correctAnswerDisplay = document.getElementById('correct-answer-display');
    
    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.correct_answer;
    const userAnswer = userAnswers[currentQuestionIndex];
    const isShortAnswer = selectedQuestionType === 'short_answer' || currentQuestion.type === 'short_answer';
    
    let isCorrect;
    if (isShortAnswer) {
        // 短答題使用AI評分結果
        if (currentQuestion.aiGrading) {
            isCorrect = currentQuestion.aiGrading.isCorrect;
        } else {
            // 如果沒有AI評分結果，使用簡單比較作為備用
            isCorrect = userAnswer && userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        }
    } else {
        isCorrect = userAnswer === correctAnswer;
    }
    
    // 顯示對錯指示
    resultIndicator.className = 'result-indicator ' + (isCorrect ? 'correct' : 'incorrect');
    resultIndicator.innerHTML = isCorrect 
        ? '<i class="fas fa-check-circle"></i> 答對了！太棒了！' 
        : '<i class="fas fa-times-circle"></i> 答錯了，再努力！';
    
    // 顯示正確答案和AI評分結果
    if (isShortAnswer) {
        correctAnswerDisplay.innerHTML = `<strong>標準答案：${correctAnswer}</strong>`;
        if (userAnswer) {
            correctAnswerDisplay.innerHTML += `<br><span style="color: #dc3545;">您的答案：${userAnswer}</span>`;
        }
        
        // 顯示AI評分結果
        if (currentQuestion.aiGrading) {
            const aiResult = currentQuestion.aiGrading;
            correctAnswerDisplay.innerHTML += `
                <div class="ai-grading-result">
                    <div class="ai-score">AI評分：${aiResult.score}分</div>
                    <div class="ai-feedback"><strong>評語：</strong>${aiResult.feedback}</div>
                    <div class="ai-reasoning"><strong>分析：</strong>${aiResult.reasoning}</div>
                </div>
            `;
        }
    } else {
        const correctOption = currentQuestion.options[correctAnswer];
        correctAnswerDisplay.innerHTML = `<strong>正確答案：${correctAnswer}. ${correctOption}</strong>`;
    }
    
    explanationDiv.style.display = 'block';
}

// 上一題
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// 下一題
function nextQuestion() {
    if (!answerConfirmed[currentQuestionIndex]) {
        alert('請先確認答案！');
        return;
    }

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    } else {
        finishQuiz();
    }
}

// 完成測驗
async function finishQuiz() {
    // 計算分數
    calculateScore();

    // 顯示結果
    displayResults();
    showSection('results');
}

// 計算分數
function calculateScore() {
    score = 0;
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const userAnswer = userAnswers[i];
        const correctAnswer = question.correct_answer;
        const isShortAnswer = selectedQuestionType === 'short_answer' || question.type === 'short_answer';
        
        let isCorrect;
        if (isShortAnswer) {
            // 短答題使用AI評分結果
            if (question.aiGrading) {
                isCorrect = question.aiGrading.isCorrect;
            } else {
                // 如果沒有AI評分結果，使用簡單比較作為備用
                isCorrect = userAnswer && userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
            }
        } else {
            isCorrect = userAnswer === correctAnswer;
        }
        
        if (isCorrect) {
            score++;
        }
    }
}

// 保存分數（帶用戶名字）
async function saveScoreWithName() {
    const userNameInput = document.getElementById('user-name');
    userName = userNameInput.value.trim() || '匿名用戶';
    
    const saveStatusDiv = document.getElementById('save-status');
    saveStatusDiv.textContent = '正在保存...';
    saveStatusDiv.className = 'save-status';
    
    // 添加調試日誌
    const saveData = {
        grade: selectedGrade,
        subject: selectedSubject,
        topic: selectedTopic,
        score: score,
        totalQuestions: questions.length,
        userName: userName,
        studyContent: selectedMode === 'advanced' ? studyContent : null,
        questionsData: questions,
        userAnswers: userAnswers,
        questionType: selectedQuestionType
    };
    
    console.log('📝 前端保存分數數據:', {
        grade: saveData.grade,
        subject: saveData.subject,
        topic: saveData.topic,
        score: saveData.score,
        totalQuestions: saveData.totalQuestions,
        userName: saveData.userName,
        questionType: saveData.questionType
    });
    
    try {
        const response = await fetch('/api/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saveData)
        });

        if (response.ok) {
            saveStatusDiv.textContent = '✅ 成績已保存到排行榜！';
            saveStatusDiv.className = 'save-status success';
            
            // 禁用保存按鈕
            document.querySelector('.save-score-btn').disabled = true;
            document.querySelector('.save-score-btn').textContent = '已保存';
        } else {
            throw new Error('保存失敗');
        }
    } catch (error) {
        console.error('保存分數錯誤:', error);
        saveStatusDiv.textContent = '❌ 保存失敗，請重試';
        saveStatusDiv.className = 'save-status error';
    }
}

// 保存分數（兼容舊版本）
async function saveScore() {
    // 自動保存，不需要用戶名字
    try {
        await fetch('/api/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grade: selectedGrade,
                subject: selectedSubject,
                topic: selectedTopic,
                score: score,
                totalQuestions: questions.length,
                userName: '匿名用戶',
                studyContent: selectedMode === 'advanced' ? studyContent : null
            })
        });
    } catch (error) {
        console.error('保存分數錯誤:', error);
    }
}

// 顯示結果
function displayResults() {
    const percentage = Math.round((score / questions.length) * 100);
    
    document.getElementById('final-score').textContent = score;
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('result-grade').textContent = selectedGrade;
    document.getElementById('result-subject').textContent = selectedSubject;
    document.getElementById('result-topic').textContent = selectedTopic;
}

// 重新開始測驗
function restartQuiz() {
    // 重置測驗相關狀態，但保持年級和科目選擇
    selectedTopic = '';
    studyContent = '';
    questions = [];
    currentQuestionIndex = 0;
    userAnswers = [];
    answerConfirmed = [];
    score = 0;
    userName = '';

    // 重置界面
    document.getElementById('topic').value = '';
    document.getElementById('topic-advanced').value = '';
    document.getElementById('study-content').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('selection-summary').style.display = 'none';
    
    // 保持年級和科目選擇，但隱藏後續步驟
    document.getElementById('subject-selection').style.display = 'none';
    document.getElementById('topic-input').style.display = 'none';
    
    // 重置模式選擇
    document.getElementById('simple-mode-btn').classList.add('active');
    document.getElementById('advanced-mode-btn').classList.remove('active');
    document.getElementById('simple-mode').style.display = 'block';
    document.getElementById('advanced-mode').style.display = 'none';
    
    // 重置題目類型選擇
    document.getElementById('multiple-choice-btn').classList.add('active');
    document.getElementById('short-answer-btn').classList.remove('active');

    // 返回首頁
    showSection('home');
}

// 載入排行榜
async function loadLeaderboard(grade = '', subject = '') {
    try {
        let url = '/api/leaderboard';
        const params = new URLSearchParams();
        
        if (grade) params.append('grade', grade);
        if (subject) params.append('subject', subject);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('載入排行榜失敗');
        }

        const data = await response.json();
        displayLeaderboard(data);
    } catch (error) {
        console.error('載入排行榜錯誤:', error);
        document.getElementById('leaderboard-table').innerHTML = '<p>載入排行榜失敗</p>';
    }
}

// 篩選排行榜
function filterLeaderboard() {
    const gradeFilter = document.getElementById('grade-filter').value;
    const subjectFilter = document.getElementById('subject-filter').value;
    loadLeaderboard(gradeFilter, subjectFilter);
}

// 清除篩選
function clearFilters() {
    document.getElementById('grade-filter').value = '';
    document.getElementById('subject-filter').value = '';
    loadLeaderboard();
}

// 顯示排行榜
function displayLeaderboard(data) {
    const tableDiv = document.getElementById('leaderboard-table');
    
    if (data.length === 0) {
        tableDiv.innerHTML = '<p>暫無排行榜數據</p>';
        return;
    }

    let html = '<div class="leaderboard-item" style="font-weight: bold; background: #667eea; color: white;">';
    html += '<div>排名</div><div>用戶</div><div>年級-科目-主題</div><div>分數</div><div>總數</div><div>百分比</div><div>時間</div><div>操作</div>';
    html += '</div>';

    data.forEach((item, index) => {
        const rank = index + 1;
        const date = new Date(item.timestamp).toLocaleDateString('zh-TW');
        const rankClass = rank <= 3 ? 'top' : '';
        
        html += `<div class="leaderboard-item">`;
        html += `<div class="leaderboard-rank ${rankClass}">#${rank}</div>`;
        html += `<div>${item.user_name || '匿名用戶'}</div>`;
        html += `<div>${item.grade}-${item.subject}-${item.topic}</div>`;
        html += `<div class="leaderboard-score">${item.score}</div>`;
        html += `<div>${item.total_questions}</div>`;
        html += `<div>${item.percentage}%</div>`;
        html += `<div>${date}</div>`;
        html += `<div class="leaderboard-actions">`;
        
        // 只有當有問答資料時才顯示按鈕
        if (item.questions_data && item.user_answers) {
            html += `<button class="action-btn-small review-btn" onclick="reviewQuizHistory(${item.id})" title="重溫問答">`;
            html += `<i class="fas fa-eye"></i> 重溫`;
            html += `</button>`;
            html += `<button class="action-btn-small copy-btn" onclick="copyQuizTopic(${item.id})" title="借用主題">`;
            html += `<i class="fas fa-copy"></i> 借用`;
            html += `</button>`;
        }
        
        html += `</div>`;
        html += `</div>`;
    });

    tableDiv.innerHTML = html;
}

// 載入統計數據
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error('載入統計失敗');
        }

        const data = await response.json();
        displayStats(data);
    } catch (error) {
        console.error('載入統計錯誤:', error);
        document.getElementById('total-attempts').textContent = '0';
        document.getElementById('average-score').textContent = '0%';
    }
}

// 顯示統計數據
function displayStats(data) {
    document.getElementById('total-attempts').textContent = data.totalAttempts;
    document.getElementById('average-score').textContent = `${data.averageScore}%`;
}

// 顯示/隱藏載入畫面
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// 錯誤處理
window.addEventListener('error', function(e) {
    console.error('頁面錯誤:', e.error);
    showLoading(false);
});

// 阻止未處理的 Promise 拒絕
window.addEventListener('unhandledrejection', function(e) {
    console.error('未處理的 Promise 拒絕:', e.reason);
    showLoading(false);
}); 

// ============ 學習內容歷史功能 ============

// 設置字數計數器
function setupCharacterCounter() {
    const studyContentTextarea = document.getElementById('study-content');
    const charCountSpan = document.getElementById('char-count');
    
    if (studyContentTextarea && charCountSpan) {
        studyContentTextarea.addEventListener('input', function() {
            charCountSpan.textContent = this.value.length;
        });
    }
}

// 切換歷史面板顯示
function toggleHistoryPanel() {
    const historyPanel = document.getElementById('history-panel');
    const isVisible = historyPanel.style.display === 'block';
    
    if (!isVisible) {
        // 顯示面板並載入歷史
        historyPanel.style.display = 'block';
        loadStudyHistory();
    } else {
        // 隱藏面板
        historyPanel.style.display = 'none';
    }
}

// 載入學習內容歷史
async function loadStudyHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="loading-message">正在載入歷史記錄...</div>';
    
    try {
        const grade = selectedGrade;
        const subject = selectedSubject;
        
        let url = '/api/study-history';
        const params = [];
        
        if (grade && subject) {
            url += `?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('載入歷史失敗');
        }
        
        const historyData = await response.json();
        displayStudyHistory(historyData);
        
    } catch (error) {
        console.error('載入學習內容歷史錯誤:', error);
        historyList.innerHTML = '<div class="loading-message">載入失敗，請重試</div>';
    }
}

// 顯示學習內容歷史
function displayStudyHistory(historyData) {
    const historyList = document.getElementById('history-list');
    
    if (!historyData || historyData.length === 0) {
        historyList.innerHTML = '<div class="no-history-message">暫無歷史記錄</div>';
        return;
    }
    
    const historyHTML = historyData.map(item => {
        const date = new Date(item.timestamp).toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const truncatedContent = item.study_content.length > 100 
            ? item.study_content.substring(0, 100) + '...'
            : item.study_content;
        
        return `
            <div class="history-item" onclick="selectHistoryItem(\`${escapeHtml(item.study_content)}\`, \`${escapeHtml(item.topic)}\`)">
                <div class="history-item-header">
                    <div class="history-item-topic">${escapeHtml(item.topic)}</div>
                    <div class="history-item-date">${date}</div>
                </div>
                <div class="history-item-content">${escapeHtml(truncatedContent)}</div>
            </div>
        `;
    }).join('');
    
    historyList.innerHTML = historyHTML;
}

// 選擇歷史項目
function selectHistoryItem(content, topic) {
    const studyContentTextarea = document.getElementById('study-content');
    const topicInput = document.getElementById('topic-advanced');
    
    // 填入內容
    studyContentTextarea.value = content;
    if (topic && topicInput) {
        topicInput.value = topic;
    }
    
    // 更新字數計數器
    const charCountSpan = document.getElementById('char-count');
    if (charCountSpan) {
        charCountSpan.textContent = content.length;
    }
    
    // 隱藏歷史面板
    toggleHistoryPanel();
    
    // 觸發輸入事件以更新其他相關狀態
    studyContentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 更新全局變量
    studyContent = content;
    selectedTopic = topic;
    updateSelectionSummary();
}

// HTML 轉義函數
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/`/g, "&#96;");
}

// 重溫問答歷史
async function reviewQuizHistory(quizId) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/quiz-history/${quizId}`);
        if (!response.ok) {
            throw new Error('獲取問答歷史失敗');
        }
        
        const quizData = await response.json();
        
        // 設置全局變量
        selectedGrade = quizData.grade;
        selectedSubject = quizData.subject;
        selectedTopic = quizData.topic;
        questions = quizData.questions_data || [];
        userAnswers = quizData.user_answers || [];
        
        if (questions.length === 0) {
            alert('此問答記錄沒有題目資料');
            return;
        }
        
        // 初始化測驗狀態為重溫模式
        currentQuestionIndex = 0;
        answerConfirmed = new Array(questions.length).fill(true); // 所有答案都已確認
        score = quizData.score;
        
        // 顯示測驗頁面
        showSection('quiz');
        setupQuizDisplay();
        displayQuestion();
        
        // 添加重溫模式標識
        const quizHeader = document.querySelector('.quiz-header');
        const reviewNotice = document.createElement('div');
        reviewNotice.className = 'review-notice';
        reviewNotice.innerHTML = '<i class="fas fa-history"></i> 重溫模式 - 查看之前的問答記錄';
        quizHeader.appendChild(reviewNotice);
        
    } catch (error) {
        console.error('重溫問答歷史錯誤:', error);
        alert('無法載入問答歷史，請重試');
    } finally {
        showLoading(false);
    }
}

// 借用主題功能
async function copyQuizTopic(quizId) {
    try {
        const response = await fetch(`/api/quiz-history/${quizId}`);
        if (!response.ok) {
            throw new Error('獲取問答歷史失敗');
        }
        
        const quizData = await response.json();
        
        // 重置到首頁並填入資料
        restartQuiz();
        
        // 設置年級和科目
        selectedGrade = quizData.grade;
        selectedSubject = quizData.subject;
        selectedTopic = quizData.topic;
        
        // 更新界面選擇狀態
        const gradeBtn = document.querySelector(`[data-grade="${selectedGrade}"]`);
        if (gradeBtn) {
            gradeBtn.classList.add('selected');
            document.getElementById('subject-selection').style.display = 'block';
        }
        
        const subjectBtn = document.querySelector(`[data-subject="${selectedSubject}"]`);
        if (subjectBtn) {
            subjectBtn.classList.add('selected');
            document.getElementById('topic-input').style.display = 'block';
        }
        
        // 填入主題
        document.getElementById('topic').value = selectedTopic;
        
        // 如果有學習內容，也填入進階模式
        if (quizData.study_content) {
            selectMode('advanced');
            document.getElementById('topic-advanced').value = selectedTopic;
            document.getElementById('study-content').value = quizData.study_content;
            studyContent = quizData.study_content;
        }
        
        updateSelectionSummary();
        
        alert(`已借用「${quizData.user_name}」的主題：${selectedTopic}，您可以開始新的測驗！`);
        
    } catch (error) {
        console.error('借用主題錯誤:', error);
        alert('無法借用主題，請重試');
    }
}

// 初始化歷史功能
document.addEventListener('DOMContentLoaded', function() {
    setupCharacterCounter();
});