const fetch = require('node-fetch');

async function listFineTunes() {
    const response = await fetch('https://api.openai.com/v1/fine-tunes', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    console.log('Fine-Tuned Models:', data);
}

listFineTunes();