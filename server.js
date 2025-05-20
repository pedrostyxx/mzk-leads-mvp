import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Adicione esta linha
import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
const PORT = 80;

// Defina __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const fetch = (await import('node-fetch')).default; // Importação dinâmica
  const apiUrl = 'https://evolutionapi.styxx.cloud';
  const instanceName = 'autosg';
  const apiKey = process.env.EVOLUTION_API_KEY; // Obtém a API key do .env
  const message = `Novo formulário recebido:\nNome: ${formData.name}\nNúmero: ${formData.number}`;

  // Lista de números para enviar a mensagem
  const phoneNumbers = ['5511930651948', '5516991002036', '16992578710']; // Adicione mais números conforme necessário

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

  // Validação simples
  if (!formData.name || !formData.whatsapp) {
    return res.status(400).json({ error: 'Nome e número são obrigatórios.' });
  }

  // Salva apenas nome e número
  const lead = {
    name: formData.name,
    number: formData.whatsapp // Aqui está correto: salva o número no campo "number"
  };

  leads.push(lead);
  saveLeads(leads); // Salva os dados no arquivo
  console.log('Dados recebidos:', lead);

  // Envia mensagem via API Evolution
  sendWhatsAppMessage(lead);

app.get('/download', (_, res) => {
  if (leads.length === 0) {
    return res.status(404).json({ error: 'Nenhum dado disponível para download.' });
  }

  const fields = ['name', 'number']; // Aqui está correto: exporta "name" e "number"
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
      res.status(500).json({ error: 'Erro ao enviar o arquivo.' });
    }
  );

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});