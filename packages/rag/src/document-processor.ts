import { Document } from './types';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { readFile } from 'fs/promises';

export class DocumentProcessor {
  async process(document: Document): Promise<string> {
    switch (document.metadata.type) {
      case 'pdf':
        return this.processPDF(document);
      case 'docx':
        return this.processDOCX(document);
      case 'txt':
        return this.processTXT(document);
      case 'html':
        return this.processHTML(document);
      default:
        throw new Error(`Type de document non supporté: ${document.metadata.type}`);
    }
  }

  private async processPDF(document: Document): Promise<string> {
    const buffer = await readFile(document.metadata.source);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async processDOCX(document: Document): Promise<string> {
    const buffer = await readFile(document.metadata.source);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private async processTXT(document: Document): Promise<string> {
    const content = await readFile(document.metadata.source, 'utf-8');
    return content;
  }

  private async processHTML(document: Document): Promise<string> {
    // TODO: Implémenter le traitement HTML
    return document.content;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }
} 