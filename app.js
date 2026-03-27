let recognition = null;
let isRecording = false;
let startTime = null;
let timerInterval = null;
let summarizeInterval = null;
let fullTranscript = '';
let lastSummaryTime = 0;
let candidateResume = null;
let candidateInfo = null;
let conversationHistory = [];
let currentSpeaker = 'HR';
let lastSpeakerChangeTime = 0;

class SpeakerClassifier {
    constructor() {
        this.hrPatterns = [
            '你好', '欢迎', '感谢', '请介绍', '能否分享', '请问', '为什么', '有什么', '了解多少',
            '工作内容', '岗位职责', '离职原因', '薪资期望', '职业规划', '为什么选择',
            '有什么问题', '还有什么想问', '期待你的加入', '我们公司', '团队', '岗位',
            '面试', '初面', '复面', '终面', '录用', 'offer', '薪资', '待遇', '福利',
            '项目经验', '技术栈', '技能', '能力', '经验', '经历', '成果', '挑战',
            '谈谈你', '说说你', '讲一下', '描述一下', '分享一下', '举例说明', '具体说说'
        ];
        
        this.candidatePatterns = [
            '我叫', '我是', '我在', '我曾', '我之前', '我负责', '我参与', '我开发', '我设计',
            '我的', '我认为', '我觉得', '我希望', '我想', '我期望', '我期待', '我的目标',
            '因为', '所以', '但是', '而且', '另外', '同时', '还有', '比如', '例如',
            '在这个项目中', '当时', '遇到了', '解决了', '实现了', '完成了', '优化了',
            '学习到', '提升了', '成长了', '收获了', '感谢', '谢谢', '好的', '明白',
            '了解', '清楚', '没问题', '可以', '好的', '是的', '对的', '没错'
        ];
        
        this.conversationState = {
            turnCount: 0,
            lastSpeaker: null,
            silenceThreshold: 1500,
            lastUtteranceTime: 0
        };
    }
    
    classifyUtterance(text, context = {}) {
        const lowerText = text.toLowerCase();
        let hrScore = 0;
        let candidateScore = 0;
        
        this.hrPatterns.forEach(pattern => {
            if (lowerText.includes(pattern.toLowerCase())) {
                hrScore += 1;
            }
        });
        
        this.candidatePatterns.forEach(pattern => {
            if (lowerText.includes(pattern.toLowerCase())) {
                candidateScore += 1;
            }
        });
        
        const questionMarks = (text.match(/[？?]/g) || []).length;
        hrScore += questionMarks * 0.5;
        
        if (text.length > 50) {
            candidateScore += 0.3;
        }
        
        const now = Date.now();
        if (now - this.conversationState.lastUtteranceTime > this.conversationState.silenceThreshold) {
            if (this.conversationState.lastSpeaker === 'HR') {
                candidateScore += 1;
            } else if (this.conversationState.lastSpeaker === 'Candidate') {
                hrScore += 1;
            }
        }
        
        const turnBias = this.conversationState.turnCount % 2 === 0 ? 0.3 : -0.3;
        hrScore += turnBias;
        
        let speaker, confidence;
        if (hrScore > candidateScore + 0.3) {
            speaker = 'HR';
            confidence = Math.min(0.95, 0.6 + (hrScore - candidateScore) * 0.1);
        } else if (candidateScore > hrScore + 0.3) {
            speaker = 'Candidate';
            confidence = Math.min(0.95, 0.6 + (candidateScore - hrScore) * 0.1);
        } else {
            speaker = this.conversationState.lastSpeaker || 'HR';
            confidence = 0.5;
        }
        
        return {
            speaker,
            confidence,
            hrScore,
            candidateScore
        };
    }
    
    updateState(speaker) {
        if (this.conversationState.lastSpeaker !== speaker) {
            this.conversationState.turnCount++;
        }
        this.conversationState.lastSpeaker = speaker;
        this.conversationState.lastUtteranceTime = Date.now();
    }
    
    reset() {
        this.conversationState = {
            turnCount: 0,
            lastSpeaker: null,
            silenceThreshold: 1500,
            lastUtteranceTime: 0
        };
    }
}

const speakerClassifier = new SpeakerClassifier();
let callTrackingData = {
    workContent: { status: 'pending', details: '' },
    skills: { status: 'pending', details: [] },
    communication: { status: 'in-progress', details: '正在评估候选人的表达清晰度、逻辑思维和反应速度' },
    problemSolving: { status: 'pending', details: '' },
    salary: { status: 'pending', details: '' },
    leaveReason: { status: 'pending', details: '' }
};

const API_CONFIG = {
    provider: 'custom',
    endpoint: '',
    apiKey: '',
    model: '',
    systemPrompt: '你是一个专业的HR面试助手，专注于首次电话沟通。请详细分析通话内容，重点关注：1. 候选人当前工作内容；2. 专业技能；3. 沟通能力；4. 问题解决能力；5. 薪资期望；6. 离职原因。请提供清晰、结构化的总结。'
};

const API_PRESETS = {
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-3-sonnet-20240229'
    },
    hunyuan: {
        endpoint: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
        defaultModel: 'hunyuan-lite'
    },
    'hunyuan-proxy': {
        endpoint: '',
        defaultModel: 'hunyuan-lite'
    }
};

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
const apiConfigPanel = document.getElementById('apiConfigPanel');
const saveApiConfigBtn = document.getElementById('saveApiConfigBtn');
const testApiConfigBtn = document.getElementById('testApiConfigBtn');
const uploadResumeBtn = document.getElementById('uploadResumeBtn');
const reuploadResumeBtn = document.getElementById('reuploadResumeBtn');
const resumeInput = document.getElementById('resumeInput');
const resumeUploadArea = document.getElementById('resumeUploadArea');
const resumeInfo = document.getElementById('resumeInfo');
const candidateInfoBox = document.getElementById('candidateInfo');
const hrSuggestionsBox = document.getElementById('hrSuggestions');
const followupPointsBox = document.getElementById('followupPoints');
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('statusText');
const speakerIndicator = document.getElementById('speakerIndicator');
const currentSpeakerText = document.getElementById('currentSpeakerText');
const timer = document.getElementById('timer');
const transcriptBox = document.getElementById('transcript');
const summaryBox = document.getElementById('summary');
const summaryStatus = document.getElementById('summaryStatus');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadProgress = document.getElementById('uploadProgress');

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';

        recognition.onstart = () => {
            updateStatus('正在录音...', true);
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                const classification = speakerClassifier.classifyUtterance(finalTranscript);
                const utterance = {
                    id: Date.now(),
                    text: finalTranscript,
                    speaker: classification.speaker,
                    confidence: classification.confidence,
                    timestamp: Date.now()
                };
                
                conversationHistory.push(utterance);
                speakerClassifier.updateState(classification.speaker);
                currentSpeaker = classification.speaker;
                
                updateSpeakerIndicator(classification.speaker);
                
                fullTranscript += finalTranscript + ' ';
                updateCallTracking(finalTranscript);
                updateFollowupPoints();
            }

            transcriptBox.innerHTML = formatTranscriptWithSpeakers(conversationHistory, interimTranscript);
            transcriptBox.scrollTop = transcriptBox.scrollHeight;
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.error('语音识别错误:', event.error);
                updateStatus('错误: ' + event.error, false);
                stopRecording();
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                recognition.start();
            }
        };

        return true;
    } else {
        alert('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器。');
        return false;
    }
}

function formatTranscriptWithSpeakers(history, interimText = '') {
    if (history.length === 0 && !interimText) {
        return '<span style="color: #6c757d;">开始录音后，这里会显示实时转录文本...</span>';
    }
    
    let html = '';
    
    history.forEach((utterance, index) => {
        const speakerColor = utterance.speaker === 'HR' ? '#667eea' : '#27ae60';
        const speakerBg = utterance.speaker === 'HR' ? '#e8eaf6' : '#e8f5e9';
        const speakerLabel = utterance.speaker === 'HR' ? '👤 HR' : '🧑 Candidate';
        const confidencePercent = Math.round(utterance.confidence * 100);
        const confidenceClass = confidencePercent >= 80 ? 'high' : confidencePercent >= 60 ? 'medium' : 'low';
        
        const time = new Date(utterance.timestamp);
        const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;
        
        const sentences = utterance.text.split(/[。！？.!?]/).filter(s => s.trim());
        
        html += `<div class="utterance ${utterance.speaker.toLowerCase()}" data-id="${utterance.id}">
            <div class="utterance-header">
                <span class="speaker-label" style="color: ${speakerColor}; background: ${speakerBg};">
                    ${speakerLabel}
                </span>
                <span class="utterance-time">${timeStr}</span>
                <span class="confidence-badge confidence-${confidenceClass}">
                    ${confidencePercent}% 置信度
                </span>
                <button class="switch-speaker-btn" onclick="switchSpeaker(${utterance.id})" title="切换说话人">
                    🔄
                </button>
            </div>
            <div class="utterance-content">`;
        
        sentences.forEach(sentence => {
            html += `<p>${sentence.trim()}。</p>`;
        });
        
        html += `</div></div>`;
    });
    
    if (interimText) {
        html += `<div class="utterance interim">
            <div class="utterance-header">
                <span class="speaker-label" style="color: #9e9e9e; background: #f5f5f5;">
                    ⌛ 识别中...
                </span>
            </div>
            <div class="utterance-content" style="color: #9e9e9e;">
                <p>${interimText}</p>
            </div>
        </div>`;
    }
    
    return html;
}

function switchSpeaker(utteranceId) {
    const index = conversationHistory.findIndex(u => u.id === utteranceId);
    if (index !== -1) {
        conversationHistory[index].speaker = conversationHistory[index].speaker === 'HR' ? 'Candidate' : 'HR';
        conversationHistory[index].confidence = 1.0;
        
        transcriptBox.innerHTML = formatTranscriptWithSpeakers(conversationHistory, '');
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
        
        showToast('说话人已切换', 'success');
    }
}

function formatTranscript(text) {
    if (!text) return '<span style="color: #6c757d;">开始录音后，这里会显示实时转录文本...</span>';
    return text.split(/[。！？.!?]/).filter(s => s.trim()).map(s => `<p>${s.trim()}。</p>`).join('');
}

function updateStatus(text, recording) {
    statusText.textContent = text;
    if (recording) {
        statusDot.classList.add('recording');
    } else {
        statusDot.classList.remove('recording');
    }
}

function startTimer() {
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timer.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startAutoSummarize() {
    if (summarizeInterval) {
        clearInterval(summarizeInterval);
    }
    
    summarizeInterval = setInterval(() => {
        if (isRecording && fullTranscript.trim()) {
            const now = Date.now();
            if (now - lastSummaryTime >= 3000) {
                summarizeText(true);
                lastSummaryTime = now;
            }
        }
    }, 500);
}

function stopAutoSummarize() {
    if (summarizeInterval) {
        clearInterval(summarizeInterval);
        summarizeInterval = null;
    }
}

function startRecording() {
    if (!initSpeechRecognition()) return;
    
    isRecording = true;
    lastSummaryTime = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    recognition.start();
    startTimer();
    startAutoSummarize();
}

function stopRecording() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }
    stopTimer();
    stopAutoSummarize();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus('准备就绪', false);
    
    if (fullTranscript.trim()) {
        summarizeText(true);
    }
}

function updateSpeakerIndicator(speaker) {
    speakerIndicator.className = speakerIndicator.className.replace(' candidate', '');
    if (speaker === 'Candidate') {
        speakerIndicator.classList.add('candidate');
    }
    currentSpeakerText.textContent = `当前：${speaker === 'HR' ? '👤 HR' : '🧑 候选人'}`;
}

function clearAll() {
    if (isRecording) {
        stopRecording();
    }
    fullTranscript = '';
    conversationHistory = [];
    currentSpeaker = 'HR';
    lastSpeakerChangeTime = 0;
    speakerClassifier.reset();
    candidateResume = null;
    candidateInfo = null;
    callTrackingData = {
        workContent: { status: 'pending', details: '' },
        skills: { status: 'pending', details: [] },
        communication: { status: 'in-progress', details: '正在评估候选人的表达清晰度、逻辑思维和反应速度' },
        problemSolving: { status: 'pending', details: '' },
        salary: { status: 'pending', details: '' },
        leaveReason: { status: 'pending', details: '' }
    };
    transcriptBox.innerHTML = '<span style="color: #6c757d;">开始录音后，这里会显示实时转录文本...</span>';
    summaryBox.textContent = '开始录音后，这里会自动显示通话总结...';
    followupPointsBox.textContent = '上传简历并开始面试后，这里会显示建议的延伸聊点...';
    summaryStatus.textContent = '自动总结已启用 (每3秒)';
    currentSpeakerText.textContent = '当前：等待开始';
    speakerIndicator.className = 'speaker-indicator';
    timer.textContent = '00:00:00';
    resumeUploadArea.style.display = 'block';
    resumeInfo.style.display = 'none';
    uploadProgress.style.display = 'none';
    updateCallTrackingUI();
}

async function summarizeText(isAuto = false) {
    if (!fullTranscript.trim()) {
        return;
    }

    if (!isAuto) {
        summaryBox.innerHTML = '<span style="color: #6c757d;">正在生成总结...</span>';
    }

    if (API_CONFIG.apiKey && API_CONFIG.endpoint) {
        try {
            const aiSummary = await callAIApi(fullTranscript);
            summaryBox.innerHTML = aiSummary;
            summaryStatus.textContent = `✅ 最后更新: ${new Date().toLocaleTimeString()}`;
            return;
        } catch (error) {
            console.error('API调用失败，使用本地总结:', error);
        }
    }

    const summary = generateLocalSummary(fullTranscript);
    summaryBox.innerHTML = summary;
    summaryStatus.textContent = `✅ 最后更新: ${new Date().toLocaleTimeString()}`;
}

async function callAIApi(text) {
    let prompt = API_CONFIG.systemPrompt;
    if (candidateInfo) {
        prompt += `\n\n候选人背景信息：\n${JSON.stringify(candidateInfo, null, 2)}`;
    }
    prompt += `\n\n当前通话追踪状态：\n${JSON.stringify(callTrackingData, null, 2)}`;

    const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
            model: API_CONFIG.model,
            messages: [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return `<h3 style="color: #27ae60; margin-bottom: 15px;">📋 首次电话沟通总结</h3><div>${data.choices[0].message.content.replace(/\n/g, '<br>')}</div>`;
}

function generateLocalSummary(text) {
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim());
    
    if (sentences.length === 0) {
        return '<p>没有足够的内容来生成总结。</p>';
    }

    let summary = '<h3 style="color: #27ae60; margin-bottom: 15px;">📋 首次电话沟通总结</h3>';
    
    summary += '<div style="margin-bottom: 20px;">';
    summary += `<p><strong>📊 基本信息：</strong></p>`;
    summary += `<ul style="margin-left: 20px; margin-top: 10px;">`;
    summary += `<li>通话时长：${timer.textContent}</li>`;
    summary += `<li>总句子数：${sentences.length} 句</li>`;
    summary += `<li>总字数：${text.length} 字</li>`;
    summary += `</ul></div>`;

    summary += '<div style="margin-bottom: 20px;">';
    summary += '<p><strong>📞 沟通追踪状态：</strong></p>';
    summary += '<ul style="margin-left: 20px; margin-top: 10px;">';
    for (const [key, value] of Object.entries(callTrackingData)) {
        const statusText = value.status === 'completed' ? '✅ 已完成' : 
                          value.status === 'in-progress' ? '🔄 进行中' : '⏳ 未开始';
        summary += `<li><strong>${getTrackingItemName(key)}：</strong>${statusText}</li>`;
    }
    summary += '</ul></div>';

    const keySentences = extractKeySentences(sentences);
    if (keySentences.length > 0) {
        summary += '<div style="margin-bottom: 20px;">';
        summary += '<p><strong>📝 通话要点：</strong></p>';
        summary += '<ul style="margin-left: 20px; margin-top: 10px;">';
        keySentences.forEach(sentence => {
            summary += `<li>${sentence.trim()}。</li>`;
        });
        summary += '</ul></div>';
    }

    return summary;
}

function getTrackingItemName(key) {
    const names = {
        workContent: '当前工作内容',
        skills: '专业技能',
        communication: '沟通能力',
        problemSolving: '问题解决能力',
        salary: '薪资期望',
        leaveReason: '离职原因'
    };
    return names[key] || key;
}

function extractKeySentences(sentences) {
    const keywords = ['工作', '职责', '项目', '经验', '技能', '能力', '薪资', '期望', '离职', '原因', '规划', '未来', '挑战', '困难', '解决', '团队', '合作'];
    const keySentences = [];
    
    sentences.forEach(sentence => {
        if (keywords.some(keyword => sentence.includes(keyword))) {
            keySentences.push(sentence);
        }
    });

    if (keySentences.length === 0) {
        return sentences.slice(0, Math.min(5, sentences.length));
    }

    return keySentences.slice(0, 10);
}

function updateCallTracking(text) {
    const lowerText = text.toLowerCase();
    
    const workKeywords = ['工作', '职责', '负责', '日常', '内容', '岗位', '职位'];
    if (workKeywords.some(k => lowerText.includes(k))) {
        callTrackingData.workContent.status = 'in-progress';
        callTrackingData.workContent.details += text;
    }
    
    const skillKeywords = ['技能', '技术', '能力', '会', '能', '熟悉', '掌握', '精通'];
    if (skillKeywords.some(k => lowerText.includes(k))) {
        callTrackingData.skills.status = 'in-progress';
        callTrackingData.skills.details.push(text);
    }
    
    const problemKeywords = ['挑战', '困难', '问题', '解决', '处理', '应对'];
    if (problemKeywords.some(k => lowerText.includes(k))) {
        callTrackingData.problemSolving.status = 'in-progress';
        callTrackingData.problemSolving.details += text;
    }
    
    const salaryKeywords = ['薪资', '薪水', '工资', '待遇', '薪酬', '期望', '期待'];
    if (salaryKeywords.some(k => lowerText.includes(k))) {
        callTrackingData.salary.status = 'completed';
        callTrackingData.salary.details += text;
    }
    
    const leaveKeywords = ['离职', '离开', '辞职', '为什么', '原因', '换工作'];
    if (leaveKeywords.some(k => lowerText.includes(k))) {
        callTrackingData.leaveReason.status = 'completed';
        callTrackingData.leaveReason.details += text;
    }
    
    updateCallTrackingUI();
}

function updateCallTrackingUI() {
    const items = [
        { id: 'workContent', data: callTrackingData.workContent },
        { id: 'skill', data: callTrackingData.skills },
        { id: 'communication', data: callTrackingData.communication },
        { id: 'problemSolving', data: callTrackingData.problemSolving },
        { id: 'salary', data: callTrackingData.salary },
        { id: 'leaveReason', data: callTrackingData.leaveReason }
    ];

    items.forEach(item => {
        const statusEl = document.getElementById(`${item.id}Status`);
        const detailsEl = document.getElementById(`${item.id}Details`);
        
        if (statusEl) {
            statusEl.className = 'status-badge ';
            if (item.data.status === 'completed') {
                statusEl.classList.add('status-completed');
                statusEl.textContent = '已完成';
            } else if (item.data.status === 'in-progress') {
                statusEl.classList.add('status-in-progress');
                statusEl.textContent = '进行中';
            } else {
                statusEl.classList.add('status-pending');
                statusEl.textContent = item.id === 'communication' ? '评估中' : '未涉及';
            }
        }
        
        if (detailsEl && item.data.details) {
            const details = Array.isArray(item.data.details) ? 
                item.data.details.slice(-3).join('...') : 
                item.data.details.substring(0, 100);
            detailsEl.textContent = details || '';
        }
    });
}

async function handleResumeUpload(file) {
    if (!file) return;
    
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '正在处理...';
    
    try {
        let content = '';
        
        if (file.name.endsWith('.txt')) {
            content = await readTextFile(file);
        } else if (file.name.endsWith('.pdf')) {
            progressText.textContent = '正在解析PDF...';
            progressFill.style.width = '30%';
            content = await readPDFFile(file);
        } else if (['.jpg', '.jpeg', '.png', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext))) {
            progressText.textContent = '正在识别图片文字...';
            progressFill.style.width = '30%';
            content = await readImageFile(file);
        } else {
            throw new Error('不支持的文件格式');
        }
        
        progressFill.style.width = '70%';
        progressText.textContent = '正在分析简历...';
        
        candidateResume = content;
        parseResume(content);
        
        progressFill.style.width = '100%';
        progressText.textContent = '处理完成！';
        
        setTimeout(() => {
            resumeUploadArea.style.display = 'none';
            resumeInfo.style.display = 'block';
            uploadProgress.style.display = 'none';
        }, 500);
        
    } catch (error) {
        console.error('文件处理失败:', error);
        progressText.textContent = '处理失败: ' + error.message;
        progressFill.style.background = '#e74c3c';
        setTimeout(() => {
            uploadProgress.style.display = 'none';
        }, 3000);
    }
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function readPDFFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
        progressFill.style.width = `${30 + (i / pdf.numPages) * 40}%`;
    }
    
    return text;
}

async function readImageFile(file) {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(
            file,
            'chi_sim+eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        progressFill.style.width = `${30 + m.progress * 40}%`;
                    }
                }
            }
        ).then(({ data: { text } }) => {
            resolve(text);
        }).catch(reject);
    });
}

function parseResume(content) {
    candidateInfo = {};
    
    const lines = content.split('\n').filter(line => line.trim());
    
    candidateInfo['姓名'] = extractInfo(lines, ['姓名', '名字'], '未知');
    candidateInfo['年龄'] = extractInfo(lines, ['年龄', '岁'], '未知');
    candidateInfo['学历'] = extractInfo(lines, ['学历', '毕业', '学校'], '未知');
    candidateInfo['工作年限'] = extractInfo(lines, ['工作经验', '工作年限', '工作时间'], '未知');
    
    const workExp = extractWorkExperience(lines);
    if (workExp.length > 0) {
        candidateInfo['工作经历'] = workExp;
    }
    
    const skills = extractSkills(lines);
    if (skills.length > 0) {
        candidateInfo['技能'] = skills;
    }
    
    displayCandidateInfo();
    generateHRSuggestions();
}

function extractInfo(lines, keywords, defaultValue) {
    for (const line of lines) {
        for (const keyword of keywords) {
            const index = line.indexOf(keyword);
            if (index !== -1) {
                const separatorIndex = line.indexOf('：', index) || line.indexOf(':', index);
                if (separatorIndex !== -1) {
                    return line.substring(separatorIndex + 1).trim();
                }
            }
        }
    }
    return defaultValue;
}

function extractWorkExperience(lines) {
    const exp = [];
    let capture = false;
    
    for (const line of lines) {
        if (line.includes('工作经历') || line.includes('工作经验')) {
            capture = true;
            continue;
        }
        if (capture && (line.includes('教育') || line.includes('技能') || line.includes('项目'))) {
            break;
        }
        if (capture && line.trim().length > 5) {
            exp.push(line.trim());
        }
    }
    
    return exp;
}

function extractSkills(lines) {
    const skills = [];
    let capture = false;
    
    for (const line of lines) {
        if (line.includes('技能') || line.includes('专业技能')) {
            capture = true;
            continue;
        }
        if (capture && (line.includes('工作') || line.includes('教育') || line.includes('项目'))) {
            break;
        }
        if (capture && line.trim().length > 2) {
            skills.push(line.trim());
        }
    }
    
    return skills;
}

function displayCandidateInfo() {
    let html = '<div style="margin-bottom: 15px;">';
    html += '<p style="color: #34c759; font-weight: 600;">✅ 简历已成功解析</p>';
    html += '<p style="color: #86868b; font-size: 14px; margin-top: 8px;">已基于简历内容生成个性化沟通建议</p>';
    html += '</div>';
    candidateInfoBox.innerHTML = html;
}

function generateHRSuggestions() {
    let suggestions = [];
    
    const hasName = candidateInfo && candidateInfo['姓名'] && candidateInfo['姓名'] !== '未知';
    const hasWorkExp = candidateInfo && candidateInfo['工作经历'] && candidateInfo['工作经历'].length > 0;
    const hasSkills = candidateInfo && candidateInfo['技能'] && candidateInfo['技能'].length > 0;
    const hasAge = candidateInfo && candidateInfo['年龄'] && candidateInfo['年龄'] !== '未知';
    const hasEducation = candidateInfo && candidateInfo['学历'] && candidateInfo['学历'] !== '未知';
    
    if (hasName || hasWorkExp || hasSkills) {
        suggestions.push({
            title: '👋 个性化开场白',
            items: generatePersonalizedOpeners()
        });
    }
    
    suggestions.push({
        title: '🎯 核心沟通重点',
        items: [
            '请详细介绍一下你目前的工作内容和职责范围',
            '你每天的主要工作任务有哪些？能举个典型例子吗？',
            '在当前岗位上，你觉得自己最核心的能力是什么？'
        ]
    });
    
    if (hasWorkExp) {
        suggestions.push({
            title: '💼 深入了解工作经历',
            items: generateWorkExpQuestions()
        });
    }
    
    if (hasSkills) {
        suggestions.push({
            title: '🛠️ 技能验证与挖掘',
            items: generateSkillQuestions()
        });
    }
    
    suggestions.push({
        title: '💰 薪资与离职',
        items: [
            '方便问一下，你对下一份工作的薪资期望范围是多少？',
            '除了薪资，你还关注哪些福利待遇？',
            '是什么原因让你考虑离开现在的工作？',
            '你在寻找新机会时，最看重的是什么？'
        ]
    });
    
    if (hasEducation) {
        suggestions.push({
            title: '🎓 教育背景',
            items: [
                `能简单介绍一下你的${candidateInfo['学历']}学习经历吗？`,
                '在校期间，哪些课程或经历对你帮助最大？'
            ]
        });
    }
    
    let html = '';
    suggestions.forEach(suggestion => {
        html += `<div class="suggestion-item">`;
        html += `<strong>${suggestion.title}</strong>`;
        html += '<ul style="margin-left: 20px; margin-top: 8px;">';
        suggestion.items.forEach(item => {
            html += `<li>${item}</li>`;
        });
        html += '</ul>';
        html += '</div>';
    });
    
    hrSuggestionsBox.innerHTML = html;
}

function generatePersonalizedOpeners() {
    const openers = [];
    const name = candidateInfo['姓名'];
    const workExp = candidateInfo['工作经历'];
    const skills = candidateInfo['技能'];
    
    if (name && name !== '未知') {
        openers.push(`"${name}你好！感谢你抽出时间来沟通，先简单介绍一下你自己吧？"`);
    } else {
        openers.push('"你好！感谢你抽出时间来沟通，先简单介绍一下你自己吧？"');
    }
    
    if (workExp && workExp.length > 0) {
        const firstExp = workExp[0].substring(0, 30);
        openers.push(`"看到你在${firstExp}...有相关经历，能先聊聊这部分吗？"`);
    }
    
    if (skills && skills.length > 0) {
        const skillList = skills.slice(0, 2).join('、');
        openers.push(`"注意到你熟悉${skillList}，能说说你是怎么掌握这些技能的吗？"`);
    }
    
    openers.push('"能否和我讲讲你目前主要负责哪些工作？"');
    
    return openers;
}

function generateWorkExpQuestions() {
    const questions = [];
    const workExp = candidateInfo['工作经历'];
    
    workExp.slice(0, 2).forEach((exp, index) => {
        const shortExp = exp.substring(0, 40);
        if (index === 0) {
            questions.push(`"在${shortExp}...这段经历中，你主要负责什么？"`);
            questions.push('"能分享一个你参与过的最有代表性的项目吗？"');
            questions.push('"在这个项目中，你遇到的最大挑战是什么？怎么解决的？"');
        } else {
            questions.push(`"关于${shortExp}...这段经历，能简单介绍一下吗？"`);
        }
    });
    
    questions.push('"从你的工作经历来看，你觉得自己最大的成长是什么？"');
    questions.push('"在之前的工作中，你最有成就感的事情是什么？"');
    
    return questions;
}

function generateSkillQuestions() {
    const questions = [];
    const skills = candidateInfo['技能'];
    
    skills.slice(0, 3).forEach((skill, index) => {
        questions.push(`"关于${skill}，你在实际工作中是如何应用的？能举个例子吗？"`);
        if (index === 0) {
            questions.push(`"在${skill}方面，你觉得自己的熟练度如何？有什么具体成果吗？"`);
        }
    });
    
    if (skills.length > 1) {
        const skillList = skills.slice(0, 3).join('、');
        questions.push(`"在${skillList}这些技能中，你最擅长哪一项？为什么？"`);
    }
    
    questions.push('"除了简历上提到的，你还有其他想让我们了解的技能吗？"');
    
    return questions;
}

function updateFollowupPoints() {
    const followups = [];
    
    if (callTrackingData.workContent.status === 'pending') {
        followups.push('可以询问候选人当前的具体工作内容和职责');
    }
    
    if (callTrackingData.skills.status === 'pending') {
        followups.push('可以了解候选人的专业技能和熟练度');
    }
    
    if (callTrackingData.problemSolving.status === 'pending') {
        followups.push('可以询问候选人遇到的挑战和解决方法');
    }
    
    if (callTrackingData.salary.status === 'pending') {
        followups.push('记得询问候选人的薪资期望范围');
    }
    
    if (callTrackingData.leaveReason.status === 'pending') {
        followups.push('需要了解候选人的离职原因和求职动机');
    }
    
    if (candidateInfo && candidateInfo['技能']) {
        const skills = candidateInfo['技能'];
        skills.slice(0, 2).forEach(skill => {
            if (!fullTranscript.includes(skill.substring(0, 2))) {
                followups.push(`可以深入了解候选人在"${skill}"方面的具体经验`);
            }
        });
    }
    
    if (followups.length === 0) {
        followups.push('可以继续深入了解候选人的工作经历和项目细节');
        followups.push('可以询问候选人对公司和岗位的了解程度');
    }
    
    let html = '';
    followups.slice(0, 6).forEach(point => {
        html += `<div class="followup-point">💡 ${point}</div>`;
    });
    
    followupPointsBox.innerHTML = html || '<span style="color: #6c757d;">暂无建议聊点</span>';
}

function exportReport() {
    if (!fullTranscript.trim()) {
        alert('请先进行面试录音后再导出报告！');
        return;
    }
    
    let report = '='.repeat(70) + '\n';
    report += '                    HR首次电话沟通报告\n';
    report += '='.repeat(70) + '\n\n';
    
    report += `面试时间：${new Date().toLocaleString()}\n`;
    report += `面试时长：${timer.textContent}\n\n`;
    
    if (candidateInfo) {
        report += '-'.repeat(70) + '\n';
        report += '候选人信息\n';
        report += '-'.repeat(70) + '\n';
        for (const [key, value] of Object.entries(candidateInfo)) {
            if (Array.isArray(value)) {
                report += `${key}：\n`;
                value.forEach(item => {
                    report += `  - ${item}\n`;
                });
            } else {
                report += `${key}：${value}\n`;
            }
        }
        report += '\n';
    }
    
    report += '-'.repeat(70) + '\n';
    report += '沟通追踪状态\n';
    report += '-'.repeat(70) + '\n';
    for (const [key, value] of Object.entries(callTrackingData)) {
        const statusText = value.status === 'completed' ? '✅ 已完成' : 
                          value.status === 'in-progress' ? '🔄 进行中' : '⏳ 未开始';
        report += `${getTrackingItemName(key)}：${statusText}\n`;
        if (value.details) {
            const details = Array.isArray(value.details) ? value.details.join('; ') : value.details;
            report += `  详情：${details.substring(0, 200)}...\n`;
        }
    }
    report += '\n';
    
    report += '-'.repeat(70) + '\n';
    report += '说话人分类分析\n';
    report += '-'.repeat(70) + '\n';
    
    if (conversationHistory.length > 0) {
        const hrCount = conversationHistory.filter(u => u.speaker === 'HR').length;
        const candidateCount = conversationHistory.filter(u => u.speaker === 'Candidate').length;
        const avgConfidence = conversationHistory.reduce((sum, u) => sum + u.confidence, 0) / conversationHistory.length;
        
        report += `HR说话次数：${hrCount}\n`;
        report += `候选人说话次数：${candidateCount}\n`;
        report += `平均置信度：${Math.round(avgConfidence * 100)}%\n\n`;
        
        report += '对话记录（含说话人）：\n';
        report += '-'.repeat(70) + '\n';
        
        conversationHistory.forEach((utterance, index) => {
            const time = new Date(utterance.timestamp);
            const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;
            const speakerLabel = utterance.speaker === 'HR' ? '👤 HR' : '🧑 候选人';
            const confidenceLabel = `[${Math.round(utterance.confidence * 100)}%]`;
            
            report += `\n[${timeStr}] ${speakerLabel} ${confidenceLabel}\n`;
            report += `  ${utterance.text}\n`;
        });
        report += '\n';
    } else {
        report += '暂无说话人分类数据\n\n';
    }
    
    report += '-'.repeat(70) + '\n';
    report += '面试实录\n';
    report += '-'.repeat(70) + '\n';
    report += fullTranscript + '\n\n';
    
    report += '-'.repeat(70) + '\n';
    report += '面试总结\n';
    report += '-'.repeat(70) + '\n';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = summaryBox.innerHTML;
    report += tempDiv.textContent.replace(/\n{3,}/g, '\n\n') + '\n';
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `首次电话沟通报告_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function toggleApiConfigPanel() {
    apiConfigPanel.style.display = apiConfigPanel.style.display === 'none' ? 'block' : 'none';
}

function handleProviderChange() {
    const provider = document.getElementById('apiProvider').value;
    if (API_PRESETS[provider]) {
        const preset = API_PRESETS[provider];
        document.getElementById('apiEndpoint').value = preset.endpoint;
        if (!document.getElementById('apiModel').value) {
            document.getElementById('apiModel').value = preset.defaultModel;
        }
    }
}

function saveApiConfig() {
    API_CONFIG.provider = document.getElementById('apiProvider').value;
    API_CONFIG.endpoint = document.getElementById('apiEndpoint').value;
    API_CONFIG.apiKey = document.getElementById('apiKey').value;
    API_CONFIG.model = document.getElementById('apiModel').value;
    API_CONFIG.systemPrompt = document.getElementById('systemPrompt').value || API_CONFIG.systemPrompt;
    
    localStorage.setItem('voiceSummaryApiConfig', JSON.stringify(API_CONFIG));
    alert('API配置已保存！');
}

function loadApiConfig() {
    const saved = localStorage.getItem('voiceSummaryApiConfig');
    if (saved) {
        const config = JSON.parse(saved);
        Object.assign(API_CONFIG, config);
        document.getElementById('apiProvider').value = API_CONFIG.provider;
        document.getElementById('apiEndpoint').value = API_CONFIG.endpoint;
        document.getElementById('apiKey').value = API_CONFIG.apiKey;
        document.getElementById('apiModel').value = API_CONFIG.model;
        document.getElementById('systemPrompt').value = API_CONFIG.systemPrompt;
    }
}

async function testApiConnection() {
    if (!API_CONFIG.apiKey || !API_CONFIG.endpoint) {
        alert('请先配置API端点和密钥！');
        return;
    }
    
    try {
        testApiConfigBtn.textContent = '测试中...';
        testApiConfigBtn.disabled = true;
        
        await callAIApi('这是一个测试，请回复"连接成功"。');
        alert('✅ API连接成功！');
    } catch (error) {
        alert('❌ API连接失败: ' + error.message);
    } finally {
        testApiConfigBtn.textContent = '测试连接';
        testApiConfigBtn.disabled = false;
    }
}

function initDragDrop() {
    const area = resumeUploadArea;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        area.addEventListener(eventName, () => {
            area.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, () => {
            area.classList.remove('drag-over');
        }, false);
    });
    
    area.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleResumeUpload(files[0]);
        }
    }, false);
}

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
clearBtn.addEventListener('click', clearAll);
exportBtn.addEventListener('click', exportReport);
toggleSettingsBtn.addEventListener('click', toggleApiConfigPanel);
saveApiConfigBtn.addEventListener('click', saveApiConfig);
testApiConfigBtn.addEventListener('click', testApiConnection);
document.getElementById('apiProvider').addEventListener('change', handleProviderChange);

uploadResumeBtn.addEventListener('click', () => resumeInput.click());
resumeInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleResumeUpload(e.target.files[0]);
    }
});

reuploadResumeBtn.addEventListener('click', () => {
    resumeUploadArea.style.display = 'block';
    resumeInfo.style.display = 'none';
    candidateResume = null;
    candidateInfo = null;
});

let jdLibrary = [];
let currentJd = null;
let selectedJd = null;
let editingJdId = null;

const toggleJdPanelBtn = document.getElementById('toggleJdPanelBtn');
const jdPanel = document.getElementById('jdPanel');
const jdList = document.getElementById('jdList');
const jdSearch = document.getElementById('jdSearch');
const jdCategory = document.getElementById('jdCategory');
const jdUploadArea = document.getElementById('jdUploadArea');
const jdDetail = document.getElementById('jdDetail');
const jdInput = document.getElementById('jdInput');
const uploadJdBtn = document.getElementById('uploadJdBtn');
const addJdBtn = document.getElementById('addJdBtn');
const saveJdBtn = document.getElementById('saveJdBtn');
const deleteJdBtn = document.getElementById('deleteJdBtn');
const selectJdBtn = document.getElementById('selectJdBtn');
const exportJdBtn = document.getElementById('exportJdBtn');
const jdSelectedPanel = document.getElementById('jdSelectedPanel');
const selectedJdTitle = document.getElementById('selectedJdTitle');
const clearSelectedJdBtn = document.getElementById('clearSelectedJdBtn');
const jdMatchPanel = document.getElementById('jdMatchPanel');
const jdMatchBox = document.getElementById('jdMatchBox');
const jdInterviewTips = document.getElementById('jdInterviewTips');
const jdAnalysisBox = document.getElementById('jdAnalysisBox');
const jdTitle = document.getElementById('jdTitle');
const jdCategoryEdit = document.getElementById('jdCategoryEdit');
const jdTags = document.getElementById('jdTags');
const jdDescription = document.getElementById('jdDescription');
const jdResponsibilities = document.getElementById('jdResponsibilities');
const jdRequirements = document.getElementById('jdRequirements');
const jdTechStack = document.getElementById('jdTechStack');
const jdUploadProgress = document.getElementById('jdUploadProgress');
const jdProgressFill = document.getElementById('jdProgressFill');
const jdProgressText = document.getElementById('jdProgressText');

function toggleJdPanel() {
    jdPanel.style.display = jdPanel.style.display === 'none' ? 'block' : 'none';
}

function loadJdLibrary() {
    const saved = localStorage.getItem('jdLibrary');
    if (saved) {
        jdLibrary = JSON.parse(saved);
    } else {
        jdLibrary = [
            {
                id: '1',
                title: '高级前端工程师',
                category: 'tech',
                tags: ['前端', 'React', 'Vue'],
                description: '负责公司核心产品的前端开发工作',
                responsibilities: '1. 负责Web应用开发\n2. 参与技术架构设计\n3. 指导初级工程师',
                requirements: '1. 3年以上前端开发经验\n2. 精通React/Vue\n3. 熟悉Node.js',
                techStack: 'React, Vue, TypeScript, Webpack',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: 1
            },
            {
                id: '2',
                title: '产品经理',
                category: 'product',
                tags: ['产品', 'B端', 'C端'],
                description: '负责产品规划和设计',
                responsibilities: '1. 产品需求分析\n2. 产品规划\n3. 跨部门协调',
                requirements: '1. 2年以上产品经验\n2. 良好的沟通能力\n3. 有B端产品经验优先',
                techStack: 'Axure, Figma, 数据分析',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: 1
            }
        ];
        saveJdLibrary();
    }
    renderJdList();
}

function saveJdLibrary() {
    localStorage.setItem('jdLibrary', JSON.stringify(jdLibrary));
}

function renderJdList() {
    const searchTerm = jdSearch.value.toLowerCase();
    const categoryFilter = jdCategory.value;
    
    let filteredJds = jdLibrary.filter(jd => {
        const matchesSearch = jd.title.toLowerCase().includes(searchTerm) ||
                             jd.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        const matchesCategory = categoryFilter === 'all' || jd.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    if (filteredJds.length === 0) {
        jdList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">暂无JD</div>';
        return;
    }
    
    const categoryNames = {
        tech: '技术类',
        product: '产品类',
        design: '设计类',
        operation: '运营类',
        marketing: '市场类',
        other: '其他'
    };
    
    jdList.innerHTML = filteredJds.map(jd => `
        <div class="jd-list-item ${editingJdId === jd.id ? 'active' : ''}" data-id="${jd.id}">
            <div class="jd-list-item-title">${jd.title}</div>
            <div class="jd-list-item-meta">
                ${categoryNames[jd.category]} | v${jd.version} | ${new Date(jd.updatedAt).toLocaleDateString()}
            </div>
        </div>
    `).join('');
    
    jdList.querySelectorAll('.jd-list-item').forEach(item => {
        item.addEventListener('click', () => {
            const jdId = item.dataset.id;
            loadJdForEditing(jdId);
        });
    });
}

function loadJdForEditing(jdId) {
    const jd = jdLibrary.find(j => j.id === jdId);
    if (!jd) return;
    
    editingJdId = jdId;
    currentJd = jd;
    
    jdTitle.value = jd.title;
    jdCategoryEdit.value = jd.category;
    jdTags.value = jd.tags.join(', ');
    jdDescription.value = jd.description;
    jdResponsibilities.value = jd.responsibilities;
    jdRequirements.value = jd.requirements;
    jdTechStack.value = jd.techStack;
    
    jdUploadArea.style.display = 'none';
    jdDetail.style.display = 'flex';
    
    renderJdList();
    generateJdAnalysis(jd);
}

function createNewJd() {
    const newId = Date.now().toString();
    const newJd = {
        id: newId,
        title: '',
        category: 'tech',
        tags: [],
        description: '',
        responsibilities: '',
        requirements: '',
        techStack: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
    };
    
    jdLibrary.unshift(newJd);
    saveJdLibrary();
    loadJdForEditing(newId);
}

function saveCurrentJd() {
    if (!editingJdId) return;
    
    const jdIndex = jdLibrary.findIndex(j => j.id === editingJdId);
    if (jdIndex === -1) return;
    
    const tags = jdTags.value.split(',').map(t => t.trim()).filter(t => t);
    
    jdLibrary[jdIndex] = {
        ...jdLibrary[jdIndex],
        title: jdTitle.value,
        category: jdCategoryEdit.value,
        tags: tags,
        description: jdDescription.value,
        responsibilities: jdResponsibilities.value,
        requirements: jdRequirements.value,
        techStack: jdTechStack.value,
        updatedAt: Date.now(),
        version: jdLibrary[jdIndex].version + 1
    };
    
    saveJdLibrary();
    renderJdList();
    generateJdAnalysis(jdLibrary[jdIndex]);
    alert('JD已保存！');
}

function deleteCurrentJd() {
    if (!editingJdId) return;
    if (!confirm('确定要删除这个JD吗？')) return;
    
    jdLibrary = jdLibrary.filter(j => j.id !== editingJdId);
    saveJdLibrary();
    
    editingJdId = null;
    currentJd = null;
    jdUploadArea.style.display = 'block';
    jdDetail.style.display = 'none';
    
    renderJdList();
}

function selectCurrentJd() {
    if (!currentJd) return;
    
    selectedJd = currentJd;
    selectedJdTitle.textContent = currentJd.title;
    jdSelectedPanel.style.display = 'block';
    
    generateInterviewTips(selectedJd);
    
    if (candidateInfo && selectedJd) {
        calculateMatchScore(candidateInfo, selectedJd);
    }
    
    jdPanel.style.display = 'none';
}

function clearSelectedJd() {
    selectedJd = null;
    jdSelectedPanel.style.display = 'none';
    jdMatchPanel.style.display = 'none';
}

function generateJdAnalysis(jd) {
    let html = '';
    
    html += `<div class="analysis-item">
        <h5>🎯 核心能力考察点</h5>
        <ul style="margin-left: 20px; line-height: 2;">`;
    
    const requirements = jd.requirements.split('\n').filter(r => r.trim());
    requirements.slice(0, 5).forEach(req => {
        html += `<li>${req.trim()}</li>`;
    });
    html += '</ul></div>';
    
    if (jd.techStack) {
        const techs = jd.techStack.split(',').map(t => t.trim()).filter(t => t);
        html += `<div class="analysis-item">
            <h5>🛠️ 技术栈匹配项</h5>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">`;
        techs.forEach(tech => {
            html += `<span style="background: #c8e6c9; padding: 4px 12px; border-radius: 12px; color: #1b5e20;">${tech}</span>`;
        });
        html += '</div></div>';
    }
    
    const responsibilities = jd.responsibilities.split('\n').filter(r => r.trim());
    if (responsibilities.length > 0) {
        html += `<div class="analysis-item">
            <h5>📋 经验要求验证方向</h5>
            <ul style="margin-left: 20px; line-height: 2;">`;
        responsibilities.slice(0, 3).forEach(resp => {
            html += `<li>请候选人分享"${resp.trim().replace(/^[0-9]+\.\s*/, '')}"的具体经验</li>`;
        });
        html += '</ul></div>';
    }
    
    jdAnalysisBox.innerHTML = html;
}

class InterviewSuggestionEngine {
    constructor() {
        this.workflow = [];
        this.executionState = {};
    }
    
    async executeWorkflow(candidate, jd) {
        this.executionState = {
            candidate,
            jd,
            results: {},
            suggestions: [],
            currentStep: 0
        };
        
        this.workflow = [
            {
                name: '技能深度分析',
                condition: () => candidate['技能'] && candidate['技能'].length > 0,
                execute: this.analyzeSkills.bind(this)
            },
            {
                name: '项目经历匹配',
                condition: () => candidate['项目经历'] && candidate['项目经历'].length > 0,
                execute: this.analyzeProjects.bind(this)
            },
            {
                name: '工作经验验证',
                condition: () => candidate['工作经历'] && candidate['工作经历'].length > 0,
                execute: this.analyzeWorkExperience.bind(this)
            },
            {
                name: '能力缺口识别',
                condition: () => true,
                execute: this.identifyGaps.bind(this)
            },
            {
                name: '综合建议生成',
                condition: () => true,
                execute: this.generateComprehensiveSuggestions.bind(this)
            }
        ];
        
        for (let i = 0; i < this.workflow.length; i++) {
            const step = this.workflow[i];
            this.executionState.currentStep = i;
            
            if (step.condition()) {
                await step.execute();
            }
        }
        
        return this.executionState;
    }
    
    analyzeSkills() {
        const { candidate, jd } = this.executionState;
        const jdTechs = jd.techStack.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        const candidateSkills = (candidate['技能'] || []).map(s => s.toLowerCase());
        
        const matchedSkills = [];
        const missingSkills = [];
        
        jdTechs.forEach(tech => {
            if (candidateSkills.some(s => s.includes(tech))) {
                matchedSkills.push(tech);
            } else {
                missingSkills.push(tech);
            }
        });
        
        this.executionState.results.skills = { matchedSkills, missingSkills };
        
        matchedSkills.forEach(skill => {
            this.executionState.suggestions.push({
                type: 'skill_verify',
                priority: 'high',
                content: `请详细描述你在${skill}方面的实际应用经验，包括具体使用场景、遇到的问题和解决方案？`,
                relatedSkill: skill
            });
        });
        
        missingSkills.slice(0, 2).forEach(skill => {
            this.executionState.suggestions.push({
                type: 'skill_gap',
                priority: 'medium',
                content: `对于${skill}，你是否有相关了解或学习计划？能否分享一下你对这个技术的理解？`,
                relatedSkill: skill
            });
        });
    }
    
    analyzeProjects() {
        const { candidate, jd } = this.executionState;
        const projects = candidate['项目经历'] || [];
        
        projects.slice(0, 2).forEach((project, index) => {
            this.executionState.suggestions.push({
                type: 'project_detail',
                priority: 'high',
                content: `请详细介绍"${project}"这个项目：你在其中担任什么角色？主要负责哪些工作？项目的难点和亮点是什么？`,
                relatedProject: project
            });
            
            this.executionState.suggestions.push({
                type: 'project_result',
                priority: 'medium',
                content: `在"${project}"项目中，你取得了哪些具体成果？能否提供一些量化的数据（如性能提升、用户增长、效率改进等）？`,
                relatedProject: project
            });
        });
    }
    
    analyzeWorkExperience() {
        const { candidate, jd } = this.executionState;
        const workExp = candidate['工作经历'] || [];
        
        if (workExp.length > 0) {
            const latestExp = workExp[0];
            this.executionState.suggestions.push({
                type: 'work_context',
                priority: 'high',
                content: `请介绍一下你在"${latestExp}"的主要工作内容，包括团队规模、汇报对象、日常工作流程等？`,
                relatedExperience: latestExp
            });
            
            this.executionState.suggestions.push({
                type: 'growth_timeline',
                priority: 'medium',
                content: `在"${latestExp}"期间，你的能力有哪些成长和提升？能否举例说明？`,
                relatedExperience: latestExp
            });
        }
    }
    
    identifyGaps() {
        const { candidate, jd } = this.executionState;
        const requirements = jd.requirements.split('\n').filter(r => r.trim());
        
        requirements.slice(0, 3).forEach(req => {
            const cleanReq = req.trim().replace(/^[0-9]+\.\s*/, '');
            this.executionState.suggestions.push({
                type: 'requirement_verify',
                priority: 'medium',
                content: `关于"${cleanReq}"这一要求，能否具体说明你的相关经验？请举例说明你在实际工作中是如何应用的？`,
                relatedRequirement: cleanReq
            });
        });
    }
    
    generateComprehensiveSuggestions() {
        const { candidate, jd } = this.executionState;
        
        this.executionState.suggestions.unshift({
            type: 'opening',
            priority: 'high',
            content: `请先做一个简短的自我介绍，重点突出与${jd.title}相关的工作经验和技能。`
        });
        
        this.executionState.suggestions.push({
            type: 'motivation',
            priority: 'medium',
            content: `你为什么对这个${jd.title}岗位感兴趣？你对我们公司和团队有哪些了解？`
        });
        
        this.executionState.suggestions.push({
            type: 'closing',
            priority: 'low',
            content: `你有什么问题想要问我吗？关于这个岗位、团队或公司的任何方面都可以。`
        });
    }
}

const suggestionEngine = new InterviewSuggestionEngine();

function generateInterviewTips(jd, candidate = null) {
    let html = '';
    
    if (candidate) {
        const state = suggestionEngine.executeWorkflow(candidate, jd);
        
        const suggestionTypes = {
            opening: { icon: '🎯', label: '开场问题', color: '#1565c0' },
            skill_verify: { icon: '💻', label: '技能验证', color: '#2e7d32' },
            skill_gap: { icon: '📚', label: '技能了解', color: '#f57c00' },
            project_detail: { icon: '🏗️', label: '项目细节', color: '#7b1fa2' },
            project_result: { icon: '📊', label: '项目成果', color: '#00796b' },
            work_context: { icon: '🏢', label: '工作背景', color: '#c62828' },
            growth_timeline: { icon: '📈', label: '成长轨迹', color: '#0277bd' },
            requirement_verify: { icon: '✅', label: '要求核实', color: '#388e3c' },
            motivation: { icon: '🔥', label: '求职动机', color: '#e65100' },
            closing: { icon: '👋', label: '结束问题', color: '#546e7a' }
        };
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const sortedSuggestions = [...state.executionState?.suggestions || []].sort((a, b) => 
            priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        
        if (sortedSuggestions.length > 0) {
            html = `<div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 10px; border-left: 4px solid #1565c0;">
                <div style="font-weight: 600; color: #0d47a1; margin-bottom: 8px;">📋 智能面试建议</div>
                <div style="font-size: 0.9rem; color: #1565c0;">已根据候选人简历生成 ${sortedSuggestions.length} 个针对性问题</div>
            </div>`;
            
            sortedSuggestions.forEach((suggestion, index) => {
                const typeInfo = suggestionTypes[suggestion.type] || { icon: '🎙️', label: '面试问题', color: '#667eea' };
                const priorityBadge = suggestion.priority === 'high' ? '⭐ 重点' : suggestion.priority === 'medium' ? '📌 关注' : '💡 了解';
                
                html += `<div class="interview-tip-item" style="border-left-color: ${typeInfo.color};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: ${typeInfo.color};">${typeInfo.icon} ${typeInfo.label}</span>
                        <span style="font-size: 0.8rem; padding: 2px 8px; background: ${suggestion.priority === 'high' ? '#f8d7da' : suggestion.priority === 'medium' ? '#fff3cd' : '#e2e3e5'}; color: ${suggestion.priority === 'high' ? '#721c24' : suggestion.priority === 'medium' ? '#856404' : '#383d41'}; border-radius: 10px;">${priorityBadge}</span>
                    </div>
                    <div style="line-height: 1.7;">${suggestion.content}</div>
                </div>`;
            });
        }
    }
    
    if (!html) {
        const tips = [
            { icon: '🎯', content: `请介绍一下你在${jd.title}方面的主要经验？` },
            { icon: '🔥', content: `你为什么对这个岗位感兴趣？` },
            { icon: '🏗️', content: `能否分享一个你最有成就感的项目经历？` }
        ];
        
        const requirements = jd.requirements.split('\n').filter(r => r.trim());
        requirements.slice(0, 2).forEach(req => {
            tips.push({ icon: '✅', content: `关于"${req.trim().replace(/^[0-9]+\.\s*/, '')}"，请具体说明你的相关经验？` });
        });
        
        tips.forEach(tip => {
            html += `<div class="interview-tip-item">${tip.icon} ${tip.content}</div>`;
        });
    }
    
    jdInterviewTips.innerHTML = html;
}

function calculateMatchScore(candidate, jd) {
    jdMatchPanel.style.display = 'block';
    
    let score = 0;
    const dimensions = [];
    const details = {
        skillMatches: [],
        skillGaps: [],
        workExperience: candidate['工作经历'] || [],
        projects: candidate['项目经历'] || [],
        education: candidate['学历'] || '未知'
    };
    
    const techStack = jd.techStack.toLowerCase();
    const candidateSkills = (candidate['技能'] || []).map(s => s.toLowerCase());
    const techs = jd.techStack.split(',').map(t => t.trim()).filter(t => t);
    
    techs.forEach(tech => {
        const techLower = tech.toLowerCase();
        if (candidateSkills.some(s => s.includes(techLower))) {
            details.skillMatches.push(tech);
        } else {
            details.skillGaps.push(tech);
        }
    });
    
    const skillScore = techs.length > 0 ? Math.round((details.skillMatches.length / techs.length) * 100) : 50;
    dimensions.push({ name: '技能匹配', score: skillScore, weight: 0.4 });
    score += skillScore * 0.4;
    
    const workExp = candidate['工作经历'] || [];
    let expScore = 50;
    if (workExp.length >= 3) expScore = 90;
    else if (workExp.length >= 2) expScore = 80;
    else if (workExp.length >= 1) expScore = 70;
    dimensions.push({ name: '工作经验', score: expScore, weight: 0.3 });
    score += expScore * 0.3;
    
    const hasEducation = candidate['学历'] && candidate['学历'] !== '未知';
    let eduScore = 60;
    if (hasEducation) {
        const edu = candidate['学历'];
        if (edu.includes('博士') || edu.includes('博士后')) eduScore = 95;
        else if (edu.includes('硕士')) eduScore = 90;
        else if (edu.includes('本科')) eduScore = 85;
        else if (edu.includes('大专')) eduScore = 75;
        else eduScore = 70;
    }
    dimensions.push({ name: '教育背景', score: eduScore, weight: 0.15 });
    score += eduScore * 0.15;
    
    let potentialScore = 70;
    if (details.projects && details.projects.length > 2) potentialScore += 10;
    if (details.skillMatches && details.skillMatches.length > 3) potentialScore += 10;
    potentialScore = Math.min(potentialScore, 100);
    dimensions.push({ name: '综合潜力', score: potentialScore, weight: 0.15 });
    score += potentialScore * 0.15;
    
    const totalScore = Math.round(score);
    
    generateInterviewTips(jd, candidate);
    
    let html = '';
    
    html += `<div class="match-score">
        <div class="match-score-number">${totalScore}%</div>
        <div class="match-score-label">${totalScore >= 80 ? '⭐ 非常匹配' : totalScore >= 60 ? '✅ 基本匹配' : '⚠️ 需要深入考察'}</div>
        <div style="margin-top: 15px;">
            <div style="width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden;">
                <div style="width: ${totalScore}%; height: 100%; background: linear-gradient(90deg, ${totalScore >= 80 ? '#27ae60' : totalScore >= 60 ? '#f39c12' : '#e74c3c'}, ${totalScore >= 80 ? '#2ecc71' : totalScore >= 60 ? '#f1c40f' : '#c0392b'}); border-radius: 10px; transition: width 0.5s ease;"></div>
            </div>
        </div>
    </div>`;
    
    html += `<div style="margin-bottom: 20px;">
        <div style="font-weight: 600; margin-bottom: 15px; color: #333;">📊 维度分析</div>`;
    
    dimensions.forEach(dim => {
        const scoreClass = dim.score >= 70 ? 'score-high' : dim.score >= 50 ? 'score-medium' : 'score-low';
        const barColor = dim.score >= 70 ? '#27ae60' : dim.score >= 50 ? '#f39c12' : '#e74c3c';
        
        html += `<div class="match-dimension">
            <div class="match-dimension-header">
                <span class="match-dimension-name">${dim.name} (权重${Math.round(dim.weight * 100)}%)</span>
                <span class="match-dimension-score ${scoreClass}">${dim.score}%</span>
            </div>
            <div style="margin-top: 8px; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                <div style="width: ${dim.score}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.5s ease;"></div>
            </div>
        </div>`;
    });
    
    html += `</div>`;
    
    if (details.skillMatches.length > 0 || details.skillGaps.length > 0) {
        html += `<div style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 15px; color: #333;">🛠️ 技能分析</div>`;
        
        if (details.skillMatches.length > 0) {
            html += `<div style="margin-bottom: 15px;">
                <div style="font-size: 0.9rem; color: #27ae60; margin-bottom: 8px;">✅ 匹配技能 (${details.skillMatches.length})</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
            details.skillMatches.forEach(skill => {
                html += `<span style="background: #d4edda; color: #155724; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem;">${skill}</span>`;
            });
            html += `</div></div>`;
        }
        
        if (details.skillGaps.length > 0) {
            html += `<div>
                <div style="font-size: 0.9rem; color: #e74c3c; margin-bottom: 8px;">📚 需要关注 (${details.skillGaps.length})</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
            details.skillGaps.forEach(skill => {
                html += `<span style="background: #f8d7da; color: #721c24; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem;">${skill}</span>`;
            });
            html += `</div></div>`;
        }
        
        html += `</div>`;
    }
    
    if (details.workExperience.length > 0) {
        html += `<div style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 10px; color: #333;">🏢 工作经历 (${details.workExperience.length}段)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
        details.workExperience.forEach(exp => {
            html += `<span style="background: #e3f2fd; color: #0d47a1; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem;">${exp}</span>`;
        });
        html += `</div></div>`;
    }
    
    if (details.projects.length > 0) {
        html += `<div>
            <div style="font-weight: 600; margin-bottom: 10px; color: #333;">🏗️ 项目经历 (${details.projects.length}个)</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
        details.projects.forEach(proj => {
            html += `<span style="background: #fff3e0; color: #e65100; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem;">${proj}</span>`;
        });
        html += `</div></div>`;
    }
    
    jdMatchBox.innerHTML = html;
}

async function handleJdUpload(file) {
    if (!file) return;
    
    jdUploadProgress.style.display = 'block';
    jdProgressFill.style.width = '0%';
    jdProgressText.textContent = '正在处理...';
    
    try {
        let content = '';
        
        if (file.name.endsWith('.txt')) {
            content = await readTextFile(file);
        } else if (file.name.endsWith('.pdf')) {
            jdProgressText.textContent = '正在解析PDF...';
            jdProgressFill.style.width = '30%';
            content = await readPDFFile(file);
        } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
            jdProgressText.textContent = '正在解析文档...';
            jdProgressFill.style.width = '30%';
            content = 'Word文档解析功能需要服务器端支持，请使用PDF或TXT格式，或手动复制粘贴内容。';
        } else {
            throw new Error('不支持的文件格式');
        }
        
        jdProgressFill.style.width = '70%';
        jdProgressText.textContent = '正在分析JD...';
        
        const parsedJd = parseJdContent(content, file.name);
        
        jdProgressFill.style.width = '100%';
        jdProgressText.textContent = '处理完成！';
        
        setTimeout(() => {
            jdUploadProgress.style.display = 'none';
            
            const newId = Date.now().toString();
            const newJd = {
                id: newId,
                title: parsedJd.title,
                category: 'tech',
                tags: parsedJd.tags,
                description: parsedJd.description,
                responsibilities: parsedJd.responsibilities,
                requirements: parsedJd.requirements,
                techStack: parsedJd.techStack,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: 1
            };
            
            jdLibrary.unshift(newJd);
            saveJdLibrary();
            loadJdForEditing(newId);
            
        }, 500);
        
    } catch (error) {
        console.error('JD处理失败:', error);
        jdProgressText.textContent = '处理失败: ' + error.message;
        jdProgressFill.style.background = '#e74c3c';
        setTimeout(() => {
            jdUploadProgress.style.display = 'none';
        }, 3000);
    }
}

function parseJdContent(content, filename) {
    const lines = content.split('\n').filter(l => l.trim());
    let title = filename.replace(/\.(txt|pdf|doc|docx)$/i, '');
    let description = '';
    let responsibilities = '';
    let requirements = '';
    let techStack = '';
    let tags = [];
    
    let section = 'description';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (i === 0 && line.length < 50) {
            title = line;
            continue;
        }
        
        if (line.includes('职责') || line.includes('岗位职责') || line.includes('Responsibilities')) {
            section = 'responsibilities';
            continue;
        }
        if (line.includes('要求') || line.includes('任职要求') || line.includes('Requirements')) {
            section = 'requirements';
            continue;
        }
        if (line.includes('技能') || line.includes('技术栈') || line.includes('Skills')) {
            section = 'techStack';
            continue;
        }
        
        switch (section) {
            case 'description':
                description += line + '\n';
                break;
            case 'responsibilities':
                responsibilities += line + '\n';
                break;
            case 'requirements':
                requirements += line + '\n';
                break;
            case 'techStack':
                techStack += line + ', ';
                break;
        }
    }
    
    const techKeywords = ['React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'Go', 'SQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', '阿里云'];
    techKeywords.forEach(tech => {
        if (content.includes(tech)) {
            tags.push(tech);
        }
    });
    
    if (content.includes('前端')) tags.push('前端');
    if (content.includes('后端')) tags.push('后端');
    if (content.includes('产品')) tags.push('产品');
    if (content.includes('设计')) tags.push('设计');
    
    return {
        title: title || '新岗位',
        description: description.trim(),
        responsibilities: responsibilities.trim(),
        requirements: requirements.trim(),
        techStack: techStack.replace(/,\s*$/, ''),
        tags: [...new Set(tags)]
    };
}

function exportJdLibrary() {
    const data = JSON.stringify(jdLibrary, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JD库_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function initJdDragDrop() {
    const area = jdUploadArea;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        area.addEventListener(eventName, () => {
            area.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, () => {
            area.classList.remove('drag-over');
        }, false);
    });
    
    area.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleJdUpload(files[0]);
        }
    }, false);
}

toggleJdPanelBtn.addEventListener('click', toggleJdPanel);
addJdBtn.addEventListener('click', createNewJd);
saveJdBtn.addEventListener('click', saveCurrentJd);
deleteJdBtn.addEventListener('click', deleteCurrentJd);
selectJdBtn.addEventListener('click', selectCurrentJd);
exportJdBtn.addEventListener('click', exportJdLibrary);
clearSelectedJdBtn.addEventListener('click', clearSelectedJd);

uploadJdBtn.addEventListener('click', () => jdInput.click());
jdInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleJdUpload(e.target.files[0]);
    }
});

jdSearch.addEventListener('input', renderJdList);
jdCategory.addEventListener('change', renderJdList);

const originalParseResume = parseResume;
parseResume = function(content) {
    originalParseResume(content);
    if (selectedJd && candidateInfo) {
        calculateMatchScore(candidateInfo, selectedJd);
    }
};

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板！', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败，请手动复制', 'error');
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: toastIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    toast.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastIn {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes toastOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
    `;
    
    if (!document.querySelector('style[data-toast]')) {
        style.setAttribute('data-toast', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2500);
}

function addInterviewTipClickHandlers() {
    setTimeout(() => {
        const tipItems = document.querySelectorAll('.interview-tip-item');
        tipItems.forEach(item => {
            item.addEventListener('click', () => {
                const text = item.innerText || item.textContent;
                copyToClipboard(text);
            });
        });
    }, 100);
}

const originalGenerateInterviewTips = generateInterviewTips;
generateInterviewTips = function(jd, candidate = null) {
    originalGenerateInterviewTips(jd, candidate);
    addInterviewTipClickHandlers();
};

window.addEventListener('load', () => {
    transcriptBox.innerHTML = '<span style="color: #6c757d;">开始录音后，这里会显示实时转录文本...</span>';
    loadApiConfig();
    initDragDrop();
    initJdDragDrop();
    loadJdLibrary();
    updateCallTrackingUI();
    
    setTimeout(() => {
        showToast('欢迎使用HR面试助手！点击"📋 JD管理"开始使用岗位管理功能', 'info');
    }, 500);
});


