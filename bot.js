require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Загрузка токенов из файла .env
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Функция для отправки сообщения в GPT через OpenAI API
async function getGPTResponse(message) {
    const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: message }],
            max_tokens: 100
        })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Настройка команды /start
bot.start((ctx) => ctx.reply('Привет! Я бот, подключенный к GPT. Напиши что-нибудь, и я отвечу!'));

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    try {
        const gptResponse = await getGPTResponse(userMessage);
        ctx.reply(gptResponse);
    } catch (error) {
        console.error('Ошибка при обращении к API OpenAI:', error);
        ctx.reply('Произошла ошибка при обращении к GPT. Попробуйте еще раз позже.');
    }
});

// Запуск бота
bot.launch();
console.log('Бот запущен!');