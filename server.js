const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
dotenv.config();

const app = express();
const PORT = 80;

// Middleware
app.use(cors({
  origin: '*', // Permite qualquer origem, ajuste conforme necessário para produção
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'apikey']
}));
app.use(bodyParser.json());

// Caminho do arquivo para armazenar os dados
const DATA_FILE = path.join(__dirname, 'leads.json');

// Função para carregar os dados do arquivo JSON
const loadLeads = () => {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  }
  return [];
};

// Função para salvar os dados no arquivo JSON
const saveLeads = (leads) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
};

// Função para enviar mensagem via API Evolution
const sendWhatsAppMessage = async (formData) => {
  const apiUrl = 'https://evolutionapi.styxx.cloud';
  const instanceName = 'autosg';
  const apiKey = process.env.EVOLUTION_API_KEY;
  const message = `Novo formulário recebido:\nNome: ${formData.name}\nNúmero: ${formData.number}`;

  const phoneNumbers = ['5511930651948', '5516991002036', '16992578710'];

  for (const phoneNumber of phoneNumbers) {
    const options = {
      method: 'POST',
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message,
      }),
    };

    try {
      const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, options);
      const result = await response.json();
      console.log(`Resposta da API Evolution para ${phoneNumber}:`, JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`Erro ao enviar mensagem para o número ${phoneNumber}:`, err);
    }
  }
};

// Carrega os dados ao iniciar o servidor
let leads = loadLeads();

// Rota para receber os dados do formulário
app.post('/submit', (req, res) => {
  const formData = req.body;

  if (!formData.name || !formData.whatsapp) {
    return res.status(400).json({ error: 'Nome e número são obrigatórios.' });
  }

  const lead = {
    name: formData.name,
    number: formData.whatsapp
  };

  leads.push(lead);
  saveLeads(leads);
  console.log('Dados recebidos:', lead);

  sendWhatsAppMessage(lead);

  res.status(200).json({ success: true });
});

// Rota para download em CSV
app.get('/download', (_, res) => {
  if (leads.length === 0) {
    return res.status(404).json({ error: 'Nenhum dado disponível para download.' });
  }

  const fields = ['name', 'number'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(leads);

  const filePath = path.join(__dirname, 'leads.csv');
  fs.writeFileSync(filePath, csv);

  res.download(filePath, 'leads.csv', (err) => {
    if (err) {
      console.error('Erro ao enviar o arquivo:', err);
      res.status(500).json({ error: 'Erro ao enviar o arquivo.' });
    }
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
