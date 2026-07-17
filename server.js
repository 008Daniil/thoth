const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');

// --- 1. LOAD ENV CONFIG ---
let config = {
    DATABASE_URL: process.env.DATABASE_URL || 'sqlite:///./uni_passport.db',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    WEBHOOK_MODE: process.env.WEBHOOK_MODE || 'false',
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_KEY: process.env.SUPABASE_KEY || ''
};

if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            config[key] = val;
        }
    });
}

// Ensure upload directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
    fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// --- 2. DATABASE LAYER (JSON File for 100% Windows Compatibility) ---
const DB_FILE = './db.json';
const DEFAULT_UNI_ID = 'a0ea0000-0000-0000-0000-000000000000';
const DEFAULT_PARTNER_ID = 'p0ea0000-0000-0000-0000-000000000000';

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = {
            partner_accounts: [
                {
                    id: DEFAULT_PARTNER_ID,
                    personal_email: 'director@aetheris-global.edu',
                    password: 'admin',
                    university_email: 'admissions@aetheris-global.edu',
                    contact_name: 'Елена Дмитриевна',
                    contact_info: '+7 (999) 123-45-67',
                    status: 'approved',
                    created_at: new Date().toISOString()
                }
            ],
            universities: [
                {
                    id: DEFAULT_UNI_ID,
                    partner_id: DEFAULT_PARTNER_ID,
                    name: 'Aetheris Global University',
                    country: 'Швейцария',
                    city: 'Женева',
                    website: 'https://aetheris-global.edu',
                    description: 'Инновационный технологический университет, сфокусированный на ИИ, квантовых технологиях и системном проектировании.',
                    min_ielts: 6.5,
                    min_sat: 1200,
                    views: 0,
                    status: 'approved',
                    created_at: new Date().toISOString()
                }
            ],
            specialties: [
                { id: crypto.randomUUID(), university_id: DEFAULT_UNI_ID, name: 'Компьютерные науки и ИИ', code: 'CS-206', tuition_fee: 12000, min_requirements: 'IELTS 6.5 / SAT 1200' },
                { id: crypto.randomUUID(), university_id: DEFAULT_UNI_ID, name: 'Робототехника и Сенсорика', code: 'ROB-301', tuition_fee: 14000, min_requirements: 'IELTS 6.0 / SAT 1150' },
                { id: crypto.randomUUID(), university_id: DEFAULT_UNI_ID, name: 'Международные Финансы и Экономика', code: 'FIN-104', tuition_fee: 11000, min_requirements: 'IELTS 6.5 / SAT 1250' },
                { id: crypto.randomUUID(), university_id: DEFAULT_UNI_ID, name: 'Медицинская Биотехнология', code: 'BIO-412', tuition_fee: 13500, min_requirements: 'IELTS 6.0' },
                { id: crypto.randomUUID(), university_id: DEFAULT_UNI_ID, name: 'Дизайн Новых Медиа', code: 'DSN-102', tuition_fee: 9500, min_requirements: 'Портфолио' }
            ],
            students: [],
            applications: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
        return initialDB;
    }
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    let updated = false;
    db.universities.forEach(u => {
        if (u.views === undefined) {
            u.views = 242;
            updated = true;
        }
    });
    if (updated) saveDB(db);
    return db;
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    syncToCloud(db); // Sync to cloud asynchronously in the background
}

async function syncToCloud(db) {
    if (!config.SUPABASE_URL || !config.SUPABASE_KEY) return;
    try {
        const url = `${config.SUPABASE_URL}/rest/v1/json_db`;
        const headers = {
            "apikey": config.SUPABASE_KEY,
            "Authorization": `Bearer ${config.SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        };
        await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ id: 1, data: db })
        });
    } catch (err) {
        console.error("Failed to sync database to Supabase:", err.message);
    }
}

async function restoreFromCloud() {
    if (!config.SUPABASE_URL || !config.SUPABASE_KEY) return;
    try {
        const url = `${config.SUPABASE_URL}/rest/v1/json_db?id=eq.1&select=data`;
        const headers = {
            "apikey": config.SUPABASE_KEY,
            "Authorization": `Bearer ${config.SUPABASE_KEY}`
        };
        const res = await fetch(url, { headers });
        if (res.ok) {
            const rows = await res.json();
            if (rows && rows.length > 0 && rows[0].data) {
                fs.writeFileSync(DB_FILE, JSON.stringify(rows[0].data, null, 2), 'utf8');
                console.log("Successfully restored database from Supabase Cloud!");
            }
        }
    } catch (err) {
        console.error("Failed to restore database from Supabase:", err.message);
    }
}

// Global state for Telegram admin session
let adminState = {
    step: 'idle' // 'idle', 'awaiting_search'
};

// --- 3. TELEGRAM BOT API ---
function sendTelegramMessage(text, replyMarkup = null) {
    if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_ADMIN_CHAT_ID) {
        console.warn('Telegram configuration missing. Skipping message.');
        return;
    }

    const payload = JSON.stringify({
        chat_id: config.TELEGRAM_ADMIN_CHAT_ID,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            // Debug output can be inspected in logs if needed
        });
    });
    req.on('error', err => console.error('Telegram sendMessage error:', err));
    req.write(payload);
    req.end();
}

function answerCallbackQuery(callbackQueryId, text) {
    const payload = JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
    });
    const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${config.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    });
    req.write(payload);
    req.end();
}

function editTelegramMessage(chatId, messageId, text, replyMarkup = { inline_keyboard: [] }) {
    const payload = JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
    });
    const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${config.TELEGRAM_BOT_TOKEN}/editMessageText`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    });
    req.write(payload);
    req.end();
}

// Moderation: Partner Account Alert
function sendPartnerAccountAlert(account) {
    const text = `📨 *Новая регистрация представителя ВУЗа!*\n\n` +
                 `🔑 *Личный Email:* ${account.personal_email}\n` +
                 `📧 *Официальный Email ВУЗа:* ${account.university_email}\n` +
                 `👤 *Контактное лицо:* ${account.contact_name}\n` +
                 `📞 *Контакты:* ${account.contact_info}\n\n` +
                 `Пожалуйста, одобрите создание аккаунта партнера:`;

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: '🟢 Одобрить аккаунт', callback_data: `approve_acc:${account.id}` },
                { text: '🔴 Отклонить', callback_data: `reject_acc:${account.id}` }
            ]
        ]
    };

    sendTelegramMessage(text, replyMarkup);
}

// Send document (like HTML preview of profile card) to Telegram admin
function sendTelegramDocument(filePath, caption = '') {
    if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_ADMIN_CHAT_ID) {
        console.warn('Telegram configuration missing. Skipping document send.');
        return;
    }

    const fs = require('fs');
    const filename = path.basename(filePath);
    const boundary = '----TelegramBotBoundary' + Math.random().toString(16);
    
    let fileContent;
    try {
        fileContent = fs.readFileSync(filePath);
    } catch (e) {
        console.error('Error reading file for Telegram send:', e);
        return;
    }

    // Build payload headers
    let payloadHeader = `--${boundary}\r\n`;
    payloadHeader += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`;
    payloadHeader += `${config.TELEGRAM_ADMIN_CHAT_ID}\r\n`;
    
    if (caption) {
        payloadHeader += `--${boundary}\r\n`;
        payloadHeader += `Content-Disposition: form-data; name="caption"\r\n\r\n`;
        payloadHeader += `${caption}\r\n`;
    }
    
    payloadHeader += `--${boundary}\r\n`;
    payloadHeader += `Content-Disposition: form-data; name="document"; filename="${filename}"\r\n`;
    payloadHeader += `Content-Type: text/html\r\n\r\n`;

    const payloadFooter = `\r\n--${boundary}--\r\n`;

    const extraLength = Buffer.byteLength(payloadHeader) + Buffer.byteLength(payloadFooter);
    const totalLength = fileContent.length + extraLength;

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${config.TELEGRAM_BOT_TOKEN}/sendDocument`,
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': totalLength
        }
    };

    const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                // Ignore
            }
        });
    });

    req.on('error', err => console.error('Telegram sendDocument error:', err));
    req.write(Buffer.from(payloadHeader));
    req.write(fileContent);
    req.write(Buffer.from(payloadFooter));
    req.end();
}

// Moderation: University Profile Alert
function sendUniversityProfileAlert(uni) {
    const db = loadDB();
    const specs = db.specialties.filter(s => s.university_id === uni.id);
    const specsText = specs.map(s => `• ${s.name} (${s.code}): $${s.tuition_fee}/год`).join('\n') || 'Специальности не заполнены';

    const text = `🏢 *Заявка на добавление/изменение профиля ВУЗа!*\n\n` +
                 `🏫 *Название:* ${uni.name}\n` +
                 `🌍 *Локация:* ${uni.country}, ${uni.city}\n` +
                 `🌐 *Сайт:* ${uni.website || 'Не указан'}\n` +
                 `📝 *Описание:* ${uni.description.substring(0, 150)}...\n` +
                 `📊 *Требования:* IELTS: ${uni.min_ielts || '—'}, SAT: ${uni.min_sat || '—'}\n\n` +
                 `📚 *Направления:* \n${specsText}\n\n` +
                 `Одобрить публикацию профиля на сайте?`;

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: '🟢 Одобрить публикацию', callback_data: `approve_uni:${uni.id}` },
                { text: '🔴 Отклонить', callback_data: `reject_uni:${uni.id}` }
            ]
        ]
    };

    sendTelegramMessage(text, replyMarkup);

    // Generate beautifully styled standalone HTML file representing the Wildberries-style profile card
    const fs = require('fs');
    
    // Calculate price range
    let priceRangeText = "от $1,500/год";
    if (specs.length > 0) {
        const fees = specs.map(s => parseFloat(s.tuition_fee)).filter(f => !isNaN(f));
        if (fees.length > 0) {
            const minFee = Math.min(...fees);
            priceRangeText = `от $${minFee.toLocaleString()}/год`;
        }
    }

    const specialtiesHtml = specs.map(s => `
        <div class="spec-opt-card" style="border: 1px dashed var(--card-border); border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem;">
            <div class="spec-opt-name" style="font-weight: bold; font-size: 1.05rem;">${s.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Код: ${s.code}</div>
            <div class="spec-opt-fee" style="color: #CAD183; font-weight: bold; margin-top: 0.5rem; font-size: 1.15rem;">$${parseInt(s.tuition_fee).toLocaleString()}/год</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">${s.min_requirements || 'Стандартные требования'}</div>
        </div>
    `).join('') || '<div style="color: var(--text-secondary); grid-column: 1/-1;">Направления отсутствуют.</div>';

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Предпросмотр профиля - ${uni.name}</title>
    <style>
        :root {
            --primary: #66023C;
            --bg: #040206;
            --text-primary: #FAF9F6;
            --text-secondary: #A396A6;
            --card-bg: rgba(25, 14, 27, 0.7);
            --card-border: rgba(102, 2, 60, 0.15);
        }
        body {
            background-color: var(--bg);
            color: var(--text-primary);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 3rem 1.5rem;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 1000px;
            width: 100%;
        }
        .header {
            margin-bottom: 2rem;
            border-bottom: 1.5px solid var(--card-border);
            padding-bottom: 1.5rem;
        }
        .header h1 {
            font-size: 2.5rem;
            margin: 0 0 0.5rem 0;
            color: var(--text-primary);
        }
        .slogan {
            font-size: 1.25rem;
            color: var(--text-secondary);
            font-style: italic;
            margin: 0;
        }
        .grid {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 2rem;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            margin-bottom: 1.5rem;
        }
        .price-title {
            font-size: 0.9rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .price-value {
            font-size: 2.2rem;
            font-weight: bold;
            color: #CAD183;
            margin: 0.5rem 0;
        }
        .specs-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-top: 1rem;
        }
        .spec-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed rgba(255,255,255,0.1);
            padding-bottom: 0.5rem;
            font-size: 0.95rem;
        }
        .spec-name {
            color: var(--text-secondary);
        }
        .spec-value {
            font-weight: 600;
        }
        .adv-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-top: 1rem;
        }
        .adv-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 1rem;
        }
        .adv-card h4 {
            margin: 0 0 0.5rem 0;
            color: #CAD183;
            font-size: 1.1rem;
        }
        .adv-card p {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-secondary);
            line-height: 1.4;
        }
        .specs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .badge {
            background: #10B981;
            color: white;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="badge">ПРЕДПРОСМОТР КАРТОЧКИ ВУЗа</span>
            <h1 style="margin-top: 0.5rem;">${uni.name}</h1>
            <p class="slogan">${uni.slogan || 'Создаем будущее вместе'}</p>
        </div>
        <div class="grid">
            <div>
                <div class="card">
                    <span class="price-title">Стоимость обучения</span>
                    <div class="price-value">${priceRangeText}</div>
                </div>
                <div class="card">
                    <h3 style="margin-top:0; color:#CAD183;">Характеристики</h3>
                    <div class="specs-list">
                        <div class="spec-item"><span class="spec-name">Страна</span><span class="spec-value">${uni.country}</span></div>
                        <div class="spec-item"><span class="spec-name">Город</span><span class="spec-value">${uni.city}</span></div>
                        <div class="spec-item"><span class="spec-name">Сайт</span><span class="spec-value">${uni.website || 'не указан'}</span></div>
                        <div class="spec-item"><span class="spec-name">IELTS (мин.)</span><span class="spec-value">${uni.min_ielts || '—'}</span></div>
                        <div class="spec-item"><span class="spec-name">SAT (мин.)</span><span class="spec-value">${uni.min_sat || '—'}</span></div>
                    </div>
                </div>
            </div>
            <div>
                <div class="card">
                    <h3 style="margin-top:0; color:#CAD183;">Описание</h3>
                    <p style="line-height:1.6; font-size:1rem; margin:0;">${uni.description}</p>
                </div>
                <div class="card">
                    <h3 style="margin-top:0; color:#CAD183;">Ключевые преимущества</h3>
                    <div class="adv-grid">
                        <div class="adv-card">
                            <h4>${uni.adv_1_title || 'Высокий рейтинг'}</h4>
                            <p>${uni.adv_1_desc || 'Входит в список передовых ВУЗов мира'}</p>
                        </div>
                        <div class="adv-card">
                            <h4>${uni.adv_2_title || 'Трудоустройство'}</h4>
                            <p>${uni.adv_2_desc || 'Более 90% выпускников находят работу'}</p>
                        </div>
                        <div class="adv-card">
                            <h4>${uni.adv_3_title || 'Студгородок'}</h4>
                            <p>${uni.adv_3_desc || 'Развитая инфраструктура и коворкинги'}</p>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <h3 style="margin-top:0; color:#CAD183;">Направления обучения</h3>
                    <div class="specs-grid">
                        ${specialtiesHtml}
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    const tempFilePath = path.join(__dirname, `preview_${uni.id}.html`);
    fs.writeFileSync(tempFilePath, htmlContent);

    // Send document to admin
    setTimeout(() => {
        sendTelegramDocument(tempFilePath, `📄 Интерактивный HTML-макет карточки ВУЗа "${uni.name}" для предпросмотра на любом устройстве`);
    }, 100);
}

// Send main admin menu with inline keyboard
function sendAdminMainMenu(messageText = 'Главное меню управления UniPassport:') {
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: '🏢 Список ВУЗов', callback_data: 'menu_list' },
                { text: '📨 Заявки', callback_data: 'menu_pending' }
            ],
            [
                { text: '🔍 Поиск по странам', callback_data: 'menu_search_countries' }
            ]
        ]
    };
    sendTelegramMessage(messageText, replyMarkup);
}

// List all universities in Telegram
function sendTelegramUniversitiesList() {
    const db = loadDB();
    const unis = db.universities;
    if (unis.length === 0) {
        sendTelegramMessage('В базе данных пока нет зарегистрированных ВУЗов.', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
        return;
    }

    sendTelegramMessage(`🏫 *Список университетов в системе (${unis.length}):*`);

    unis.forEach(uni => {
        const specsCount = db.specialties.filter(s => s.university_id === uni.id).length;
        const details = `📍 ${uni.country}, ${uni.city} | Cтатус: ${uni.status === 'approved' ? '🟢 Опубликован' : '⏳ На модерации'} | Направлений: ${specsCount}`;
        
        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '📄 Детали', callback_data: `view_uni:${uni.id}` },
                    { text: '❌ Удалить', callback_data: `delete_uni:${uni.id}` }
                ]
            ]
        };
        sendTelegramMessage(`*${uni.name}*\n${details}`, replyMarkup);
    });

    // Final back button
    setTimeout(() => {
        sendTelegramMessage('Вернуться в главное меню:', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
    }, 50);
}

// List pending registrations
function sendTelegramPendingAccounts() {
    const db = loadDB();
    const pendingAccs = db.partner_accounts.filter(a => a.status === 'pending');
    if (pendingAccs.length === 0) {
        sendTelegramMessage('Ожидающих заявок на регистрацию аккаунтов нет.', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
        return;
    }

    sendTelegramMessage(`📨 *Ожидают модерации аккаунтов (${pendingAccs.length}):*`);
    pendingAccs.forEach(acc => {
        const text = `👤 *Имя:* ${acc.contact_name}\n📧 *Email:* ${acc.personal_email}\n🏫 *Email ВУЗа:* ${acc.university_email}`;
        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '🟢 Одобрить аккаунт', callback_data: `approve_acc:${acc.id}` },
                    { text: '🔴 Отклонить', callback_data: `reject_acc:${acc.id}` }
                ]
            ]
        };
        sendTelegramMessage(text, replyMarkup);
    });

    // Final back button
    setTimeout(() => {
        sendTelegramMessage('Вернуться в главное меню:', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
    }, 50);
}

// Telegram Callback Queries processing
function processTelegramUpdate(update) {
    const db = loadDB();

    // 1. Text command updates (fallback / search query inputs)
    if (update.message && update.message.text) {
        const msg = update.message;
        const text = msg.text.trim();
        const chatId = msg.chat.id;

        // Skip non-admin chats
        if (String(chatId) !== String(config.TELEGRAM_ADMIN_CHAT_ID)) {
            return;
        }

        if (text === '/start' || text === '/menu') {
            adminState.step = 'idle';
            sendAdminMainMenu('Добро пожаловать в админ-панель управления UniPassport! Пожалуйста, используйте кнопки меню ниже:');
            return;
        }

        // If in search step, execute search
        if (adminState.step === 'awaiting_search') {
            const query = text.toLowerCase();
            const matches = db.universities.filter(u => 
                u.name.toLowerCase().includes(query) ||
                u.country.toLowerCase().includes(query) ||
                u.city.toLowerCase().includes(query)
            );

            if (matches.length === 0) {
                sendTelegramMessage(`По вашему запросу "${text}" ничего не найдено. Напишите другой запрос или нажмите на кнопку ниже:`, { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
                return;
            }

            sendTelegramMessage(`🔍 *Результаты текстового поиска по запросу "${text}" (${matches.length}):*`);
            matches.forEach(uni => {
                const specsCount = db.specialties.filter(s => s.university_id === uni.id).length;
                const details = `📍 ${uni.country}, ${uni.city} | Статус: ${uni.status === 'approved' ? '🟢 Опубликован' : '⏳ На модерации'} | Направлений: ${specsCount}`;
                const replyMarkup = {
                    inline_keyboard: [
                        [
                            { text: '📄 Детали', callback_data: `view_uni:${uni.id}` },
                            { text: '❌ Удалить', callback_data: `delete_uni:${uni.id}` }
                        ]
                    ]
                };
                sendTelegramMessage(`*${uni.name}*\n${details}`, replyMarkup);
            });
            
            adminState.step = 'idle'; // Reset state after search
            
            // Final back button
            setTimeout(() => {
                sendTelegramMessage('Вернуться в главное меню:', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
            }, 50);
            return;
        }
    }

    // 2. Callback inline button updates
    if (update.callback_query) {
        const query = update.callback_query;
        const queryId = query.id;
        const data = query.data || '';
        const message = query.message || {};
        const chatId = message.chat ? message.chat.id : null;
        const messageId = message.message_id;

        if (!chatId) return;

        let action = data;
        let id = '';
        if (data.includes(':')) {
            const parts = data.split(':');
            action = parts[0];
            id = parts.slice(1).join(':');
        }

        // Inline Navigation Actions
        if (action === 'menu_main') {
            adminState.step = 'idle';
            sendAdminMainMenu('Главное меню управления UniPassport:');
            answerCallbackQuery(queryId, 'Главное меню');
        }
        
        else if (action === 'menu_list') {
            adminState.step = 'idle';
            sendTelegramUniversitiesList();
            answerCallbackQuery(queryId, 'Список ВУЗов');
        }
        
        else if (action === 'menu_pending') {
            adminState.step = 'idle';
            sendTelegramPendingAccounts();
            answerCallbackQuery(queryId, 'Очередь заявок');
        }
        
        else if (action === 'menu_search_countries') {
            adminState.step = 'idle';
            const textMenu = '🌎 *Выберите страну для фильтрации ВУЗов:*';
            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '🇨🇭 Швейцария', callback_data: 'search_country:Швейцария' },
                        { text: '🇺🇸 США', callback_data: 'search_country:США' }
                    ],
                    [
                        { text: '🇷🇺 Россия', callback_data: 'search_country:Россия' },
                        { text: '🇸🇬 Сингапур', callback_data: 'search_country:Сингапур' }
                    ],
                    [
                        { text: '🇬🇧 Великобритания', callback_data: 'search_country:Великобритания' }
                    ],
                    [
                        { text: '⌨️ Текстовый поиск', callback_data: 'search_text_init' }
                    ],
                    [
                        { text: '« Назад в меню', callback_data: 'menu_main' }
                    ]
                ]
            };
            sendTelegramMessage(textMenu, replyMarkup);
            answerCallbackQuery(queryId, 'Фильтр стран');
        }
        
        else if (action === 'search_country') {
            adminState.step = 'idle';
            const queryCountry = id.toLowerCase();
            const matches = db.universities.filter(u => u.country.toLowerCase() === queryCountry);
            
            if (matches.length === 0) {
                sendTelegramMessage(`По стране "${id}" ничего не найдено.`, { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
            } else {
                sendTelegramMessage(`🔍 *Результаты поиска по стране "${id}" (${matches.length}):*`);
                matches.forEach(uni => {
                    const specsCount = db.specialties.filter(s => s.university_id === uni.id).length;
                    const details = `📍 ${uni.country}, ${uni.city} | Направлений: ${specsCount}`;
                    const replyMarkup = {
                        inline_keyboard: [
                            [
                                { text: '📄 Детали', callback_data: `view_uni:${uni.id}` },
                                { text: '❌ Удалить', callback_data: `delete_uni:${uni.id}` }
                            ]
                        ]
                    };
                    sendTelegramMessage(`*${uni.name}*\n${details}`, replyMarkup);
                });
                
                // Final back button
                setTimeout(() => {
                    sendTelegramMessage('Вернуться в главное меню:', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
                }, 50);
            }
            answerCallbackQuery(queryId, `Поиск по ${id}`);
        }
        
        else if (action === 'search_text_init') {
            adminState.step = 'awaiting_search';
            sendTelegramMessage('⌨️ *Режим текстового поиска активирован.*\nОтправьте следующим сообщением название ВУЗа, страну или город для поиска.', { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'menu_main' }]] });
            answerCallbackQuery(queryId, 'Ожидание ввода текста');
        }

        // Moderation / Manipulation actions
        else if (action === 'approve_acc') {
            const acc = db.partner_accounts.find(a => a.id === id);
            if (!acc) {
                answerCallbackQuery(queryId, 'Аккаунт не найден.');
                return;
            }
            acc.status = 'approved';
            saveDB(db);

            const updatedText = `📨 *Регистрация представителя ВУЗа ОДОБРЕНА!*\n\n` +
                                `👤 *Имя:* ${acc.contact_name}\n` +
                                `📧 *Email:* ${acc.personal_email}\n` +
                                `🏫 *Email ВУЗа:* ${acc.university_email}\n\n` +
                                `Статус: *🟢 Одобрен* (модератор: ${query.from.first_name || 'Админ'})`;
            editTelegramMessage(chatId, messageId, updatedText);
            answerCallbackQuery(queryId, 'Аккаунт успешно активирован!');
        }

        else if (action === 'reject_acc') {
            const acc = db.partner_accounts.find(a => a.id === id);
            if (!acc) {
                answerCallbackQuery(queryId, 'Аккаунт не найден.');
                return;
            }
            acc.status = 'rejected';
            saveDB(db);

            const updatedText = `📨 *Регистрация представителя ВУЗа ОТКЛОНЕНА!*\n\n` +
                                `👤 *Имя:* ${acc.contact_name}\n` +
                                `📧 *Email:* ${acc.personal_email}\n\n` +
                                `Статус: *🔴 Отклонен*`;
            editTelegramMessage(chatId, messageId, updatedText);
            answerCallbackQuery(queryId, 'Регистрация отклонена.');
        }

        else if (action === 'approve_uni') {
            const uni = db.universities.find(u => u.id === id);
            if (!uni) {
                answerCallbackQuery(queryId, 'Профиль ВУЗа не найден.');
                return;
            }
            uni.status = 'approved';
            saveDB(db);

            const updatedText = `🏢 *Публикация профиля ВУЗа ОДОБРЕНА!*\n\n` +
                                `🏫 *Название:* ${uni.name}\n` +
                                `🌍 *Локация:* ${uni.country}, ${uni.city}\n\n` +
                                `Статус профиля: *🟢 Опубликован на сайте*`;
            editTelegramMessage(chatId, messageId, updatedText);
            answerCallbackQuery(queryId, 'Профиль опубликован!');
        }

        else if (action === 'reject_uni') {
            const uni = db.universities.find(u => u.id === id);
            if (!uni) {
                answerCallbackQuery(queryId, 'Профиль ВУЗа не найден.');
                return;
            }
            uni.status = 'rejected';
            saveDB(db);

            const updatedText = `🏢 *Публикация профиля ВУЗа ОТКЛОНЕНА!*\n\n` +
                                `🏫 *Название:* ${uni.name}\n\n` +
                                `Статус: *🔴 Отклонен (черновик)*`;
            editTelegramMessage(chatId, messageId, updatedText);
            answerCallbackQuery(queryId, 'Публикация отклонена.');
        }

        else if (action === 'view_uni') {
            const uni = db.universities.find(u => u.id === id);
            if (!uni) {
                answerCallbackQuery(queryId, 'ВУЗ не найден.');
                return;
            }

            const specs = db.specialties.filter(s => s.university_id === uni.id);
            const specsListText = specs.map(s => `• *${s.name}* (${s.code})\n Стоимость: $${s.tuition_fee}/год\n Требования: ${s.min_requirements || 'нет'}`).join('\n\n') || 'Специальности отсутствуют';

            const card = `🏫 *${uni.name}*\n` +
                         `📍 *Локация:* ${uni.country}, ${uni.city}\n` +
                         `🌐 *Сайт:* ${uni.website || 'нет'}\n` +
                         `📊 *Академический ценз:* IELTS ${uni.min_ielts || '—'}, SAT ${uni.min_sat || '—'}\n` +
                         `📝 *Описание:* ${uni.description}\n\n` +
                         `📚 *Список факультетов:*\n${specsListText}`;

            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '❌ Удалить ВУЗ', callback_data: `delete_uni:${uni.id}` },
                        { text: '« Меню', callback_data: 'menu_main' }
                    ]
                ]
            };
            sendTelegramMessage(card, replyMarkup);
            answerCallbackQuery(queryId, 'Детали открыты.');
        }

        else if (action === 'delete_uni') {
            const uniIndex = db.universities.findIndex(u => u.id === id);
            if (uniIndex === -1) {
                answerCallbackQuery(queryId, 'ВУЗ уже удален.');
                return;
            }
            const uniName = db.universities[uniIndex].name;
            
            // Delete university
            db.universities.splice(uniIndex, 1);
            // Delete associated specialties
            db.specialties = db.specialties.filter(s => s.university_id !== id);
            // Delete associated applications
            db.applications = db.applications.filter(a => a.university_id !== id);

            saveDB(db);

            editTelegramMessage(chatId, messageId, `❌ Университет *${uniName}* был успешно удален из базы данных.`);
            answerCallbackQuery(queryId, 'ВУЗ успешно удален.');
            
            setTimeout(() => {
                sendTelegramMessage('Главное меню:', { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'menu_main' }]] });
            }, 50);
        }
    }
}

// Background Telegram Polling Loop
function startTelegramPolling() {
    if (!config.TELEGRAM_BOT_TOKEN) {
        console.warn('Telegram Bot Token is not set. Telegram service is disabled.');
        return;
    }

    console.log('Starting Telegram Bot Polling loop (Node.js)...');
    let offset = 0;

    setInterval(() => {
        const path = `/bot${config.TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=5`;
        https.get({
            hostname: 'api.telegram.org',
            port: 443,
            path: path
        }, res => {
            let rawData = '';
            res.on('data', chunk => rawData += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(rawData);
                    if (response.ok && response.result) {
                        response.result.forEach(update => {
                            offset = update.update_id + 1;
                            processTelegramUpdate(update);
                        });
                    }
                } catch (e) {
                    // Fail silently
                }
            });
        }).on('error', () => {
            // Silence networking errors
        });
    }, 2500);
}

// --- 4. EXPRESS APP SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

// Disable browser caching for development
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Serve static frontend files
app.use('/frontend', express.static(path.join(__dirname, 'frontend'), { dotfiles: 'allow' }));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${crypto.randomUUID()}${ext}`);
    }
});
const upload = multer({ storage: storage });

// --- 5. API ROUTES ---

// GET: Approved Universities
app.get('/api/v1/universities', (req, res) => {
    const db = loadDB();
    const approved = db.universities.filter(u => u.status === 'approved');
    res.json(approved.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

// GET: University Details with Specialties
app.get('/api/v1/universities/:id', (req, res) => {
    const db = loadDB();
    const uniIndex = db.universities.findIndex(u => u.id === req.params.id);
    if (uniIndex === -1) {
        return res.status(404).json({ detail: 'University not found' });
    }
    
    // Increment real views in the university object
    db.universities[uniIndex].views = (db.universities[uniIndex].views || 0) + 1;
    saveDB(db);

    const uni = db.universities[uniIndex];
    const specs = db.specialties.filter(s => s.university_id === uni.id);
    res.json({ ...uni, specialties: specs });
});

// GET: My University Profile for Logged-in Partner
app.get('/api/v1/universities/my-profile/:partner_id', (req, res) => {
    const db = loadDB();
    const uni = db.universities.find(u => u.partner_id === req.params.partner_id);
    if (!uni) {
        return res.json(null);
    }
    const specs = db.specialties.filter(s => s.university_id === uni.id);
    res.json({ ...uni, specialties: specs });
});

// POST: Login representative
app.post('/api/v1/partners/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ detail: 'Missing email or password' });
    }

    const db = loadDB();
    const acc = db.partner_accounts.find(a => a.personal_email === email && a.password === password);
    if (!acc) {
        return res.status(401).json({ detail: 'Неверный email или пароль.' });
    }

    if (acc.status === 'pending') {
        return res.status(403).json({ detail: 'Ваш аккаунт ожидает подтверждения администратором.' });
    }

    if (acc.status === 'rejected') {
        return res.status(403).json({ detail: 'Вам было отказано в доступе.' });
    }

    res.json({
        id: acc.id,
        email: acc.personal_email,
        contact_name: acc.contact_name,
        university_email: acc.university_email,
        status: acc.status
    });
});

// POST: Register partner account (creates in 'pending' status)
app.post('/api/v1/universities/register', (req, res) => {
    const { personal_email, password, university_email, name, contact_name, contact_info, website } = req.body;
    if (!personal_email || !password || !university_email || !name || !contact_name || !contact_info) {
        return res.status(400).json({ detail: 'Missing required fields' });
    }

    const db = loadDB();
    if (db.partner_accounts.some(u => u.personal_email === personal_email)) {
        return res.status(400).json({ detail: 'Email уже зарегистрирован в системе' });
    }

    const partnerId = crypto.randomUUID();
    const newAccount = {
        id: partnerId,
        personal_email,
        password,
        university_email,
        contact_name,
        contact_info,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    db.partner_accounts.push(newAccount);
    
    // Save draft university association (so name matches, pending account verification)
    const newUni = {
        id: crypto.randomUUID(),
        partner_id: partnerId,
        name,
        country: '',
        city: '',
        website: website || '',
        description: '',
        min_ielts: null,
        min_sat: null,
        status: 'pending_profile',
        created_at: new Date().toISOString()
    };
    db.universities.push(newUni);

    saveDB(db);

    // Alert admin about account registration
    setTimeout(() => sendPartnerAccountAlert(newAccount), 50);

    res.json({
        status: 'success',
        message: 'Аккаунт успешно создан и ожидает верификации.',
        partner_id: partnerId
    });
});

// POST: Create or Update Student Profile (from Onboarding Intro Wizard)
app.post('/api/v1/students/profile', (req, res) => {
    const { full_name, phone, birthday, gpa, ielts_score, sat_score } = req.body;
    if (!phone || !full_name) {
        return res.status(400).json({ detail: 'Необходимы ФИО и номер телефона' });
    }

    const db = loadDB();
    let student = db.students.find(s => s.phone === phone);

    if (student) {
        student.full_name = full_name;
        student.birthday = birthday || student.birthday || null;
        student.gpa = gpa ? parseFloat(gpa) : (student.gpa || null);
        if (ielts_score !== undefined) student.ielts_score = ielts_score ? parseFloat(ielts_score) : student.ielts_score;
        if (sat_score !== undefined) student.sat_score = sat_score ? parseInt(sat_score) : student.sat_score;
    } else {
        student = {
            id: crypto.randomUUID(),
            full_name,
            phone,
            birthday: birthday || null,
            gpa: gpa ? parseFloat(gpa) : null,
            ielts_score: ielts_score ? parseFloat(ielts_score) : null,
            sat_score: sat_score ? parseInt(sat_score) : null,
            bio: null,
            extra_achievements: null,
            created_at: new Date().toISOString()
        };
        db.students.push(student);
    }

    saveDB(db);
    res.json({
        status: 'success',
        message: 'Цифровой паспорт успешно обновлен/создан',
        profile: student
    });
});

// POST: Create or Update University Profile (with specialties)
app.post('/api/v1/universities/profile', (req, res) => {
    const { 
        partner_id, name, country, city, website, description, min_ielts, min_sat, specialties,
        slogan, adv_1_title, adv_1_desc, adv_2_title, adv_2_desc, adv_3_title, adv_3_desc, photo 
    } = req.body;
    
    if (!partner_id || !name || !country || !city || !description) {
        return res.status(400).json({ detail: 'Missing required fields' });
    }

    const db = loadDB();
    
    // Find if university profile already exists
    let uni = db.universities.find(u => u.partner_id === partner_id);
    
    if (uni) {
        uni.name = name;
        uni.country = country;
        uni.city = city;
        uni.website = website || '';
        uni.description = description;
        uni.min_ielts = min_ielts ? parseFloat(min_ielts) : null;
        uni.min_sat = min_sat ? parseInt(min_sat) : null;
        uni.slogan = slogan || '';
        uni.adv_1_title = adv_1_title || '';
        uni.adv_1_desc = adv_1_desc || '';
        uni.adv_2_title = adv_2_title || '';
        uni.adv_2_desc = adv_2_desc || '';
        uni.adv_3_title = adv_3_title || '';
        uni.adv_3_desc = adv_3_desc || '';
        uni.photo = photo || '';
        uni.status = 'pending_profile'; // Go back to pending validation
    } else {
        uni = {
            id: crypto.randomUUID(),
            partner_id,
            name,
            country,
            city,
            website: website || '',
            description,
            min_ielts: min_ielts ? parseFloat(min_ielts) : null,
            min_sat: min_sat ? parseInt(min_sat) : null,
            slogan: slogan || '',
            adv_1_title: adv_1_title || '',
            adv_1_desc: adv_1_desc || '',
            adv_2_title: adv_2_title || '',
            adv_2_desc: adv_2_desc || '',
            adv_3_title: adv_3_title || '',
            adv_3_desc: adv_3_desc || '',
            photo: photo || '',
            status: 'pending_profile',
            views: 0,
            created_at: new Date().toISOString()
        };
        db.universities.push(uni);
    }

    // Save specialties
    // Delete old specialties for this uni
    db.specialties = db.specialties.filter(s => s.university_id !== uni.id);
    
    // Add new ones
    if (specialties && Array.isArray(specialties)) {
        specialties.forEach(spec => {
            db.specialties.push({
                id: crypto.randomUUID(),
                university_id: uni.id,
                name: spec.name,
                code: spec.code || 'FAC',
                tuition_fee: spec.tuition_fee ? parseInt(spec.tuition_fee) : 0,
                min_requirements: spec.min_requirements || ''
            });
        });
    }

    saveDB(db);

    // Trigger Telegram notification for university profile moderation
    setTimeout(() => sendUniversityProfileAlert(uni), 50);

    res.json({
        status: 'success',
        message: 'Профиль отправлен на модерацию',
        university: uni
    });
});

// POST: Apply to university (Upload file)
app.post('/api/v1/applications/apply', upload.single('file'), (req, res) => {
    const { university_id, specialty_id, full_name, phone, ielts_score, sat_score, gpa, bio, extra_achievements } = req.body;
    if (!university_id || !specialty_id || !full_name || !phone || !req.file) {
        return res.status(400).json({ detail: 'Missing required fields or file' });
    }

    const db = loadDB();
    const uni = db.universities.find(u => u.id === university_id);
    const spec = db.specialties.find(s => s.id === specialty_id);

    if (!uni || !spec) {
        return res.status(404).json({ detail: 'University or specialty not found' });
    }

    // Find or create student profile
    let student = db.students.find(s => s.phone === phone);
    if (student) {
        student.full_name = full_name;
        if (ielts_score !== undefined) student.ielts_score = ielts_score ? parseFloat(ielts_score) : null;
        if (sat_score !== undefined) student.sat_score = sat_score ? parseInt(sat_score) : null;
        if (gpa !== undefined) student.gpa = gpa ? parseFloat(gpa) : null;
        if (bio !== undefined) student.bio = bio;
        if (extra_achievements !== undefined) student.extra_achievements = extra_achievements;
    } else {
        student = {
            id: crypto.randomUUID(),
            full_name,
            phone,
            birthday: null,
            gpa: gpa ? parseFloat(gpa) : null,
            ielts_score: ielts_score ? parseFloat(ielts_score) : null,
            sat_score: sat_score ? parseInt(sat_score) : null,
            bio: bio || null,
            extra_achievements: extra_achievements || null,
            created_at: new Date().toISOString()
        };
        db.students.push(student);
    }

    // Create Application
    const newApp = {
        id: crypto.randomUUID(),
        student_id: student.id,
        university_id: university_id,
        specialty_id: specialty_id,
        document_path: req.file.path,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    db.applications.push(newApp);
    saveDB(db);

    res.json({
        status: 'success',
        message: 'Документы успешно переданы в приемную комиссию',
        application_id: newApp.id,
        student_id: student.id
    });
});

// GET: Student profile and apps
app.get('/api/v1/students/:phone/profile', (req, res) => {
    const db = loadDB();
    const student = db.students.find(s => s.phone === req.params.phone);
    if (!student) {
        return res.status(404).json({ detail: 'Student passport not found' });
    }

    const apps = db.applications.filter(a => a.student_id === student.id).map(a => {
        const uni = db.universities.find(u => u.id === a.university_id) || {};
        const spec = db.specialties.find(s => s.id === a.specialty_id) || {};
        return {
            id: a.id,
            university_name: uni.name || 'Unknown',
            specialty_name: spec.name || 'Unknown',
            specialty_code: spec.code || '',
            status: a.status,
            created_at: a.created_at,
            document_name: path.basename(a.document_path)
        };
    });

    res.json({
        profile: student,
        applications: apps
    });
});

// GET: Dashboard Stats
app.get('/api/v1/dashboard/:uni_id/stats', (req, res) => {
    const db = loadDB();
    const uni = db.universities.find(u => u.id === req.params.uni_id);
    if (!uni) {
        return res.status(404).json({ detail: 'University not found' });
    }

    const appsCount = db.applications.filter(a => a.university_id === req.params.uni_id).length;
    
    // Real views (must be at least appsCount)
    const views = Math.max(uni.views || 0, appsCount);
    const conv = views > 0 ? parseFloat(((appsCount / views) * 100).toFixed(2)) : 0.00;

    // Distribute real views over the week for mock chart
    const chartData = [];
    const baseViews = Math.floor(views / 7);
    const remainder = views % 7;
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        let dayViews = baseViews;
        if (i === 6) dayViews += remainder; // Add remainder to today
        
        // Mock applications distributed over the week
        let dayApps = 0;
        if (appsCount > 0) {
            if (i === 6) {
                dayApps = appsCount - Math.floor(appsCount / 2);
            } else if (i === 3) {
                dayApps = Math.floor(appsCount / 2);
            }
        }

        chartData.push({
            date: dateStr,
            views: dayViews,
            applications: dayApps
        });
    }

    res.json({
        total_views: views,
        total_applications: appsCount,
        conversion_rate: conv,
        chart_data: chartData
    });
});

// GET: Leads
app.get('/api/v1/dashboard/:uni_id/leads', (req, res) => {
    const db = loadDB();
    const leads = db.applications.filter(a => a.university_id === req.params.uni_id).map(a => {
        const student = db.students.find(s => s.id === a.student_id) || {};
        const spec = db.specialties.find(s => s.id === a.specialty_id) || {};
        const uni = db.universities.find(u => u.id === a.university_id) || {};
        return {
            id: a.id,
            student_id: a.student_id,
            university_id: a.university_id,
            specialty_id: a.specialty_id,
            status: a.status,
            created_at: a.created_at,
            document_name: path.basename(a.document_path),
            student: student,
            specialty: spec,
            university: uni
        };
    });

    res.json(leads.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
});

// POST: Update Application Status
app.post('/api/v1/applications/:app_id/status', (req, res) => {
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ detail: 'Missing status' });
    }

    const db = loadDB();
    const appItem = db.applications.find(a => a.id === req.params.app_id);
    if (!appItem) {
        return res.status(404).json({ detail: 'Application lead not found' });
    }

    appItem.status = status;
    saveDB(db);
    res.json({ status: 'success', message: `Application status updated to ${status}` });
});

// GET: Download applicant document
app.get('/api/v1/applications/download/:app_id', (req, res) => {
    const db = loadDB();
    const appItem = db.applications.find(a => a.id === req.params.app_id);
    if (!appItem || !appItem.document_path) {
        return res.status(404).json({ detail: 'Application or document not found' });
    }

    if (!fs.existsSync(appItem.document_path)) {
        return res.status(404).json({ detail: 'File is missing on server storage' });
    }

    const student = db.students.find(s => s.id === appItem.student_id) || { full_name: 'student' };
    const safeName = `certificate_${student.full_name.replace(/\s+/g, '_')}${path.extname(appItem.document_path)}`;
    
    res.download(appItem.document_path, safeName);
});

// Serve index.html at root
app.get('/', (req, res) => {
    const filePath = path.resolve(__dirname, 'frontend', 'index.html');
    res.sendFile(filePath, { dotfiles: 'allow' }, err => {
        if (err) {
            console.error('Error sending file:', err);
            if (!res.headersSent) {
                res.status(404).send('index.html not found: ' + filePath);
            }
        }
    });
});

// --- 6. START SERVER ---
const PORT = process.env.PORT || 8000;

async function startApp() {
    await restoreFromCloud();
    loadDB(); // Initialize DB file and seed if missing
    app.listen(PORT, () => {
        console.log(`UniPassport server is running at http://localhost:${PORT}`);
        startTelegramPolling();
    });
}

startApp();
