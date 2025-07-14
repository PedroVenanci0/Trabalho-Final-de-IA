// --- CONFIGURAÇÃO ---
const API_KEY = ""; // COLOQUE AQUI SUA CHAVE DE API
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
const PERSONA = `Você é um "Mestre de Jogo" de RPG de mesa (como Dungeons & Dragons). Sua personalidade é sábia, paciente e criativa. Use termos de RPG como "rolar um d20", "teste de resistência", "perícia", "campanha", etc. Seja descritivo e imersivo. Encerre suas respostas com "Que seus dados rolem alto." ou "A aventura o aguarda.".`;

// --- SELETORES DE ELEMENTOS DO DOM ---
const sendButton = document.getElementById('send-button');
const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-upload');
const chatMessages = document.getElementById('chat-messages');
const diceOverlay = document.getElementById('dice-overlay');
const diceTray = document.getElementById('dice-tray');

// --- VARIÁVEL DE ESTADO ---
let imageBase64 = null;

// --- EVENT LISTENERS ---
sendButton.addEventListener('click', handleSendMessage);
textInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSendMessage());
imageInput.addEventListener('change', handleImageUpload);

// --- FUNÇÕES PRINCIPAIS ---

async function handleSendMessage() {
    const promptText = textInput.value.trim();
    if (!promptText && !imageBase64) return;

    displayMessage(promptText || "Mestre, decifre este pergaminho.", 'user');
    textInput.value = '';

    // NOVO: Verifica se a mensagem é um comando de rolagem de dados
    const diceNotationRegex = /(\d+)d(\d+)\s*([+-]\s*\d+)?/i;
    if (diceNotationRegex.test(promptText)) {
        await handleDiceRoll(promptText);
    } else {
        await handleGeminiRequest(promptText);
    }
}

async function handleGeminiRequest(promptText) {
    const loadingMessage = displayMessage('Consultando os tomos antigos...', 'bot');
    try {
        const requestBody = {
            contents: [{ parts: [{ text: promptText }, ...(imageBase64 ? [{ inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] : [])] }],
            system_instruction: { parts: [{ text: PERSONA }] }
        };
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (!response.ok || !data.candidates) throw new Error(data?.error?.message || "A conexão astral falhou.");
        loadingMessage.textContent = data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Erro na API:", error);
        loadingMessage.textContent = `Uma força sombria interferiu: ${error.message}`;
    } finally {
        imageBase64 = null;
        imageInput.value = '';
    }
}

// --- NOVO: Funções para Rolagem de Dados ---

async function handleDiceRoll(notation) {
    const match = notation.match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/i);
    if (!match) return;

    const [, countStr, sidesStr, modifierStr] = match;
    const count = parseInt(countStr, 10);
    const sides = parseInt(sidesStr, 10);
    const modifier = modifierStr ? parseInt(modifierStr.replace(/\s/g, ''), 10) : 0;

    diceTray.innerHTML = ''; // Limpa a bandeja
    diceOverlay.classList.add('visible');

    let total = 0;
    let rolls = [];
    for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
        const dieElement = document.createElement('div');
        dieElement.className = 'die';
        dieElement.textContent = roll;
        diceTray.appendChild(dieElement);
    }

    const finalTotal = total + modifier;
    const rollsText = rolls.join(' + ');
    const modifierText = modifier > 0 ? ` + ${modifier}` : (modifier < 0 ? ` - ${Math.abs(modifier)}` : '');
    
    // Espera a animação terminar para esconder e mostrar o resultado
    setTimeout(() => {
        diceOverlay.classList.remove('visible');
        displayMessage(`Você rolou ${notation}...\nResultado: [${rollsText}]${modifierText} = ${finalTotal}`, 'bot');
    }, 2000); // 2 segundos para ver o resultado
}

// --- Funções Auxiliares ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        imageBase64 = reader.result.split(',')[1];
        displayMessage('Vejo que me trouxe um artefato... Diga-me o que deseja saber.', 'bot');
    };
    reader.readAsDataURL(file);
}

function displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}