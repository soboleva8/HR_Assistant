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

function formatList(text) {
    return text
        // Добавляем перенос строки перед каждым номером списка (1., 2., ...)
        .replace(/(\d+)\.\s*/g, '\n$1. ') 
        // Убираем переносы строк, если они следуют сразу за номером списка
        .replace(/(\d+\.\s*)\n/g, '$1') 
        // Добавляем перенос строки после заголовка (до первого предложения после номера)
        .replace(/(\d+\.\s+[^\.\n]+\.)(\s+)/g, '$1\n') 
        // Добавляем перенос строки после "!" и "?"
        .replace(/([!?])\s+/g, '$1\n') 
        // Добавляем перенос строки после ".", только если это конец предложения, а не номер списка
        .replace(/(?<!\d)([.])\s+(?=[А-ЯA-Z])/g, '$1\n') 
        // Убираем лишние переносы строк
        .replace(/\n+/g, '\n') 
        // Убираем пробелы в начале и конце текста
        .trim();
}

async function sendLongMessage(ctx, text) {
    const MAX_LENGTH = 4096;

    if (text.length <= MAX_LENGTH) {
        await ctx.reply(text);
        return;
    }

    const chunks = [];
    let remainingText = text;

    while (remainingText.length > 0) {
        let chunk = remainingText.slice(0, MAX_LENGTH);

        if (remainingText.length > MAX_LENGTH) {
            const lastPeriodIndex = chunk.lastIndexOf('.'); // Ищем последнюю точку
            if (lastPeriodIndex !== -1) {
                chunk = remainingText.slice(0, lastPeriodIndex + 1); // Захватываем до точки
            }
        }

        chunks.push(chunk.trim()); // Добавляем часть в массив, убирая лишние пробелы
        remainingText = remainingText.slice(chunk.length).trim(); // Убираем обработанную часть
    }

    // Отправляем каждую часть по очереди
    for (const chunk of chunks) {
        await ctx.reply(chunk);
    }
}

bot.command('start', (ctx) => {
    if (ctx.chat.id !== GROUP_ID) {
        return;
    }
    ctx.reply('Привет! Я отвечаю только участникам этой группы.');
});

bot.on('message:text', async (ctx) => {
    if (ctx.chat.id !== GROUP_ID) {
        return;
    }

    const userMessage = ctx.message.text;
   
    try {
        const gptResponse = await getGPTResponse(userMessage); // Генерация ответа
        const formattedResponse = formatList(gptResponse);
        await sendLongMessage(ctx, formattedResponse); // Отправка длинного ответа
    } catch (error) {
        console.error(`[ERROR] Ошибка обработки сообщения: ${error.message}`);
        ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

bot.start();
console.log('Бот запущен!');