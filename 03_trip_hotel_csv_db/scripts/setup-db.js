#!/usr/bin/env node
/**
 * SQLite hotels 테이블 생성
 */

import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outputDir = join(process.cwd(), 'output');
mkdirSync(outputDir, { recursive: true });
const dbPath = join(outputDir, 'hotels.db');
const schemaPath = join(process.cwd(), 'schema', 'hotels.sql');

const schema = readFileSync(schemaPath, 'utf8');
const db = new Database(dbPath);
db.exec(schema);
db.close();
console.log('DB created:', dbPath);
