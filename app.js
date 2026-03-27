let recognition = null;
let isRecording = false;
let startTime = null;
let timerInterval = null;
let summarizeInterval = null;
let fullTranscript = '';
let lastSummaryTime = 0;
let candidateResume = null;
let candidateInfo = null;
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
                fullTranscript += finalTranscript + ' ';
                updateCallTracking(finalTranscript);
                updateFollowupPoints();
            }

            transcriptBox.innerHTML = formatTranscript(fullTranscript + interimTranscript);
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

function clearAll() {
    if (isRecording) {
        stopRecording();
    }
    fullTranscript = '';
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
    
    for (const [key, value] of Object.entries(candidateInfo)) {
        if (key === '工作经历' || key === '技能') {
            html += `<p><strong>${key}：</strong></p>`;
            html += '<ul style="margin-left: 20px; margin-top: 5px; margin-bottom: 10px;">';
            value.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
        } else {
            html += `<p><strong>${key}：</strong>${value}</p>`;
        }
    }
    
    html += '</div>';
    candidateInfoBox.innerHTML = html;
}

function generateHRSuggestions() {
    let suggestions = [];
    
    suggestions.push({
        title: '🎯 首次沟通重点',
        items: [
            '确认候选人当前的具体工作内容和职责',
            '了解候选人的核心专业技能和熟练度',
            '评估候选人的沟通表达能力和逻辑思维',
            '询问候选人的薪资期望范围',
            '了解候选人的离职原因和求职动机'
        ]
    });
    
    suggestions.push({
        title: '💬 推荐破冰话术',
        items: [
            '"你好！感谢你抽出时间来沟通，先简单介绍一下你自己吧？"',
            '"能否和我讲讲你目前主要负责哪些工作？"',
            '"在工作中，你最擅长的技能是什么？能举个例子吗？"',
            '"方便问一下，你对薪资有什么期望吗？"',
            '"是什么原因让你考虑换工作呢？"'
        ]
    });
    
    if (candidateInfo && candidateInfo['工作经历']) {
        suggestions.push({
            title: '🔍 基于简历的深入问题',
            items: [
                `从你的经历来看，你在${candidateInfo['工作经历'][0] || '相关领域'}有经验，能否分享一个代表性项目？`,
                '在简历提到的这些技能中，你最擅长哪一项？在实际工作中如何应用？',
                '根据你的背景，你觉得自己应聘这个岗位的最大优势是什么？'
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

window.addEventListener('load', () => {
    transcriptBox.innerHTML = '<span style="color: #6c757d;">开始录音后，这里会显示实时转录文本...</span>';
    loadApiConfig();
    initDragDrop();
    updateCallTrackingUI();
});
