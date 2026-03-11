#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(express.json());

const MODEL = 'gemini-2.5-flash-lite';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.post('/chat', async (req, res) => {
  const { reviews, question } = req.body || {};
  if (!question) {
    return res.json({ error: 'question required' });
  }
  if (!genAI.apiKey) {
    return res.json({ error: 'GEMINI_API_KEY not set in .env' });
  }
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `당신은 호텔 투숙객 리뷰만을 기반으로 질문에 답하는 AI입니다. 아래 리뷰 데이터를 읽고, 리뷰에 나온 내용만으로만 답변하세요. 리뷰에 없는 내용은 추측하지 마세요.

## 수집된 리뷰
${reviews || '(리뷰 없음)'}

## 사용자 질문
${question}

## 답변 (리뷰 기반으로만)`;

    const result = await model.generateContent(prompt);
    const reply = result.response?.text?.() || '(답변 없음)';
    res.json({ reply });
  } catch (err) {
    res.json({ error: err.message || 'Gemini API error' });
  }
});

const PORT = 8791;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Trip.com AI server on http://0.0.0.0:' + PORT + ' (accessible via 10.130.81.124:' + PORT + ')');
});
