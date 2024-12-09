import dotenv from 'dotenv';
import { Bot } from 'grammy';
import fetch from 'node-fetch';
import { cleanEnv, str, num } from 'envalid';
import fs from 'fs';

dotenv.config();

const env = cleanEnv(process.env, {
    TELEGRAM_TOKEN: str(),
    OPENAI_API_KEY: str(),
    TELEGRAM_GROUP_ID: num(),
    PROMPT: str(),
    MODEL_ID: str(),
    MODEL_TEMPERATURE: num(),
    MODEL_TOP_P: num(),
    MODEL_MAX_TOKENS: num(),
    MODEL_FREQUENCY_PENALTY: num(),
    MODEL_PRESENCE_PENALTY: num()
});

const TELEGRAM_TOKEN = env.TELEGRAM_TOKEN;
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const GROUP_ID = env.TELEGRAM_GROUP_ID;
const PROMPT = fs.readFileSync('prompt.txt', 'utf-8').split('\n').map(line => line.trim()).join(' ');
const modelSettings = {
    modelID: env.MODEL_ID,
    temperature: env.MODEL_TEMPERATURE,
    top_p: env.MODEL_TOP_P,
    max_tokens: env.MODEL_MAX_TOKENS,
    frequency_penalty: env.MODEL_FREQUENCY_PENALTY,
    presence_penalty: env.MODEL_PRESENCE_PENALTY
};

const keywordsFile = fs.readFileSync('keywords.txt', 'utf-8');
const keywords = keywordsFile.split('\n').map((word) => word.trim()).filter(Boolean);


function isRelevantQuestion(message) {
    return keywords.some((keyword) => message.toLowerCase().includes(keyword.toLowerCase()));
}

if (!TELEGRAM_TOKEN) {
    console.error("Ошибка: TELEGRAM_TOKEN отсутствует.");
    process.exit(1);
}
if (!OPENAI_API_KEY) {
    console.error("Ошибка: OPENAI_API_KEY отсутствует.");
    process.exit(1);
}

const bot = new Bot(TELEGRAM_TOKEN);

async function getGPTResponse(message) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: modelSettings.modelID,
                messages: [
                    { role: "system", content: PROMPT },
                    { role: "user", content: message }
                ],
                max_tokens: modelSettings.max_tokens,
                temperature: modelSettings.temperature,
                top_p: modelSettings.top_p,
                frequency_penalty: modelSettings.frequency_penalty,
                presence_penalty: modelSettings.presence_penalty
            })
        });

        const data = await response.json();
        console.log('Ответ от OpenAI:', data);

        if (data.error) {
            console.error('Ошибка от OpenAI:', data.error);
            return 'Произошла ошибка при обработке вашего запроса.';
        }

        if (data && data.choices && data.choices.length > 0) {
            return data.choices[0].message.content.trim();
        } else {
            console.error('Неверный формат ответа от API OpenAI:', data);
            return 'Извините, я не смог получить ответ. Попробуйте еще раз позже.';
        }
    } catch (error) {
        console.error('Ошибка при обращении к API OpenAI:', error);
        return 'Произошла ошибка при обращении к GPT. Попробуйте позже.';
    }
}

// Команда /start
bot.command('start', (ctx) => {
    if (ctx.chat.id !== GROUP_ID) {
        return; // Игнорируем команды вне группы
    }
    ctx.reply('Привет! Я отвечаю только участникам этой группы.');
});

// Обработка текстовых сообщений
bot.on('message:text', async (ctx) => {
    if (ctx.chat.id !== GROUP_ID) {
        return; // Игнорируем сообщения вне группы
    }

    const userMessage = ctx.message.text;

    if (!isRelevantQuestion(userMessage)) {
        ctx.reply('Я могу помочь только с вопросами, касающимися управления персоналом.');
        return;
    }
    
    try {
        const gptResponse = await getGPTResponse(userMessage);
        ctx.reply(gptResponse);
    } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
        ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Запуск бота
bot.start();
console.log('Бот запущен!');