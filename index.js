const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// === ATUALIZAÇÃO nael  ===

const fs = require('fs');


// === ATUALIZAÇÃO nael ===

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', async (qr) => {
    const qrcode = require('qrcode-terminal');
    
    const qrImage = await QRCode.toDataURL(qr);

    console.log(qrImage);
});

client.on('authenticated', () => {
    console.log('AUTENTICADO');
});

client.on('ready', () => {
    console.log('BOT CONECTADO!');
});

const menu = {
    "1": "Nosso horário de atendimento é das 08:00 às 18:00.",
    "2": "Estamos localizados na Rua Exemplo, 123.",
    "3": "Um atendente entrará em contato em breve.",
    "4": "Aceitamos PIX, cartão e dinheiro."
};


// === ATUALIZAÇÃO NAEL ===

function carregarClientes() {
    try {

        if (!fs.existsSync('clientes.json')) {
            return {};
        }

        const dados = fs.readFileSync(
            'clientes.json',
            'utf8'
        );

        return JSON.parse(dados);

    } catch (erro) {

        console.error(
            'Erro ao carregar clientes:',
            erro
        );

        return {};
    }
}

function salvarClientes(clientes) {
    
    console.log(
        "Salvando arquivo em:",
        __dirname
    );
    fs.writeFileSync(
        'clientes.json',
        JSON.stringify(
            clientes,
            null,
            4
        )
    );
}
function registrarInteracao(
    numero,
    tipo,
    valor
) {
    console.log("REGISTRANDO...");
    console.log(numero);
    console.log(tipo);
    console.log(valor);
    const clientes = carregarClientes();

    if (!clientes[numero]) {

        clientes[numero] = {
            primeiroContato: new Date().toLocaleString(),
            opcoes: [],
            mensagens: []
        };
    }

    if (tipo === "opcao") {

        if (
            !clientes[numero].opcoes.includes(valor)
        ) {
            clientes[numero].opcoes.push(valor);
        }

    } else if (tipo === "mensagem") {

        clientes[numero].mensagens.push({
            horario: new Date().toLocaleString(),
            texto: valor
        });

        // Mantém apenas as últimas 50 mensagens
        if (clientes[numero].mensagens.length > 50) {
            clientes[numero].mensagens.shift();
        }
    }

    salvarClientes(clientes);
}

// === ATUALIZAÇÃO NAEL ===

function gerarMenu() {
    return `Olá! 👋

Escolha uma opção:

1 - Horário de atendimento
2 - Endereço
3 - Falar com suporte
4 - Formas de pagamento`;
}

// === FUNÇÃO AUXILIAR DE DELAY ===
// Faz o bot esperar o tempo definido (em milissegundos) antes de ir para a próxima linha
const delay = ms => new Promise(res => setTimeout(res, ms));
async function gerarResumo(numero) {

    const nomeCliente =
    await obterNomeCliente(numero);
    const clientes = carregarClientes();

    const cliente = clientes[numero];
    

    if (!cliente) {

        return "Nenhuma informação encontrada para este cliente.";
    }

    let resumo = `📋 RESUMO DO ATENDIMENTO

👤 Cliente:
${nomeCliente}

📞 ID:
${numero}
;


📅 Primeiro contato:
${cliente.primeiroContato}

`;

    if (
        cliente.opcoes &&
        cliente.opcoes.length > 0
    ) {

        resumo += "📌 Opções selecionadas:\n";

        cliente.opcoes.forEach(opcao => {

            resumo += `• ${opcao}\n`;
        });

        resumo += "\n";
    }

    if (
        cliente.mensagens &&
        cliente.mensagens.length > 0
    ) {

        resumo += "💬 Histórico da conversa:\n\n";

        cliente.mensagens.forEach(msg => {

            if (!msg.texto) return;

            resumo += `• ${msg.texto}\n`;

        });
    }

    return resumo;
}
const clientesAguardando = {};
const clientesAtendidos = {};
async function obterNomeCliente(numero) {

    try {

        const contato = await client.getContactById(numero);

        return (
            contato.pushname ||
            contato.name ||
            contato.number ||
            numero
        );

    } catch (erro) {

        console.log(
            "Erro ao obter nome:",
            erro
        );

        return numero;
    }
}

client.on('message_create', async message => {

    console.log("MESSAGE_CREATE DISPAROU");

    console.log("fromMe:", message.fromMe);
    console.log("body:", message.body);
    console.log("to:", message.to);

    if (!message.fromMe) return;

    const texto = (
        message.body || ""
    )
        .trim()
        .toLowerCase();

    if (texto !== "/resumo") return;

    const numero = message.to;
    console.log("GERANDO RESUMO DE:", numero);

    const resumo = await gerarResumo(numero);

    await message.reply(resumo);
});

client.on('message', async message => {
    // REGRA DE OURO 1: Ignora completamente mensagens enviadas por você ou pelo próprio bot
    if (message.fromMe || message.id.fromMe) return;

    // REGRA DE OURO 2: Ignora se a mensagem vier de um grupo
    if (message.from.endsWith('@g.us')) {
        console.log(`Mensagem recebida em grupo (${message.from}). Ignorando...`);
        return;
    }

    const numero = message.from;

    try {
        // --- VERIFICAÇÃO PARA SEGUNDA MENSAGEM ---
        if (!clientesAtendidos[numero]) {
            const chat = await message.getChat();
            const mensagens = await chat.fetchMessages({ limit: 2 });
            
            if (mensagens.length > 1) {
                const messageAnterior = mensagens[mensagens.length - 2];
                
                if (messageAnterior.fromMe || messageAnterior.id.fromMe) {
                    clientesAtendidos[numero] = true;
                    clientesAguardando[numero] = true; 
                    console.log(`Conversa iniciada manualmente com ${numero}. Bot silenciado.`);
                    return; 
                }
            }
        }
        // ---------------------------------------------

        // --- TRATAMENTO ISOLADO PARA ÁUDIO DO CLIENTE ---
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            
            if (media && media.mimetype.startsWith('audio')) {
                if (clientesAguardando[numero]) {
                    console.log(`Áudio recebido de ${numero}, mas o cliente já está aguardando suporte. Ignorado.`);
                    return;
                }

                console.log("Áudio recebido do cliente. Aplicando delay de 3 segundos...");
                await delay(3000); // Espera 3 segundos simulando audição/digitação
                
                if (!clientesAtendidos[numero]) {
                    clientesAtendidos[numero] = true;
                    await message.reply(`Recebemos sua mensagem de áudio. 🎤\n\nEm breve um atendente ouvirá e responderá sua solicitação.\n\nCaso prefira agilizar seu atendimento, você também pode selecionar uma das opções abaixo:\n\n${gerarMenu()}`);
                } else {
                    await message.reply(`Recebemos sua mensagem de áudio. 🎤\n\nEm breve um atendente ouvirá e responderá sua solicitação.\n\nCaso deseje visualizar novamente as opções de atendimento, digite *MENU*.`);
                }

                clientesAguardando[numero] = true;
                return; 
            }
        }
        // -------------------------------------

        const texto = (message.body || "")
            .trim()
            .toLowerCase();
        
            registrarInteracao(
            numero,
            "mensagem",
            message.body
        );

        // MENU (Quando o cliente digita "menu")
        if (texto === "menu") {
            console.log("Enviando menu... Aplicando delay de 2 segundos...");
            clientesAguardando[numero] = false;
            clientesAtendidos[numero] = true; 
            
            await delay(2000); // Espera 2 segundos
            await message.reply(gerarMenu());
            return;
        }

        // Primeira mensagem de texto do cliente
        if (!clientesAtendidos[numero]) {
            clientesAtendidos[numero] = true;
            
            console.log("Primeira mensagem de texto. Aplicando delay de 3 segundos...");
            await delay(3000); // Espera 3 segundos
            await message.reply(gerarMenu());
            return;
        }

        // Opções do menu (1, 2, 3 ou 4)
        if (menu[texto]) {

            console.log("PASSOU AQUI- OPCAO");

            registrarInteracao(
                numero,
                "opcao",
                menu[texto]
            );
            await delay(2000); // Espera 2 segundos
            await message.reply(
                menu[texto]
            );

            return;
        }
        
        

        // Já recebeu aviso de espera (ignora textos repetidos para não fludar)
        if (clientesAguardando[numero]) {
            return;
        }

        // Qualquer outro texto fora do menu (Aviso de encaminhamento para suporte)
        console.log("Texto fora do menu. Aplicando delay de 3 segundos antes do aviso...");
        
        await delay(3000); // Espera 3 segundos
        await message.reply(
`Um momento por favor.

Nossa equipe retornará o mais breve possível.

Caso deseje visualizar novamente as opções de atendimento, digite *MENU*.`
        );

        clientesAguardando[numero] = true;

    } catch (erro) {
        console.error('Erro:', erro);
    }
});

// Inicialização do cliente (sempre na última linha)

client.initialize();
