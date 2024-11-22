require('dotenv').config();
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');

// Загрузка токенов из файла .env
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Проверка на наличие API-ключа
if (!OPENAI_API_KEY) {
    console.error("Ошибка: API-ключ OpenAI отсутствует.");
    process.exit(1);
}

// Функция для отправки сообщения в Fine-Tuned модель через OpenAI API
async function getGPTResponse(message) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "ft:gpt-4o-mini-2024-07-18:personal:hrass:AVkTnruE", // Ваш Fine-Tuned Model ID
                messages: [
                    { role: "system", content: "Ты специалист в сфере управления персоналом в Центре Занятости населения Российской Федерации и знаешь содержание всех основных HR (Human Resource) процессов. Ты отвечаешь за следующие задачи: 1. Подбор персонала Центра Занятости Населения Российской Федерации. 2. Адаптация персонала Центра Занятости Населения Российской Федерации. 3. Оценка качества работы персонала Центра Занятости Населения Российской Федерации. 4. Обучение персонала Центра Занятости Населения Российской Федерации. 5. Мотивация персонала Центра Занятости Населения Российской Федерации. 6. Управление кадровым резервом Центра Занятости Населения Российской Федерации. 7. Управление корпоративной культурой Центра Занятости Населения Российской Федерации. 8. Планирование работы с персоналом Центра Занятости Населения Российской Федерации. 9. Распределение ответственности и полномочий. В своей работе ты руководствуешься исключительно загруженной Базой Знания." },
                    { role: "user", content: message }
                ],
                max_tokens: 1000,
                temperature: 0.5,
                top_p: 0.5,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        const data = await response.json();
        console.log('Ответ от OpenAI:', data); // Логирование ответа для отладки

        if (data.error) {
            console.error('Ошибка от OpenAI:', data.error);
            return 'Произошла ошибка при обработке вашего запроса.';
        }

        // Проверка структуры ответа
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

// Настройка команды /start
bot.start((ctx) => ctx.reply('Привет! Я твой персонализированный помощник. Напиши что-нибудь, и я отвечу!'));

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;
    try {
        const gptResponse = await getGPTResponse(userMessage);
        ctx.reply(gptResponse);
    } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
        ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
});

// Запуск бота
bot.launch();
console.log('Бот запущен!');