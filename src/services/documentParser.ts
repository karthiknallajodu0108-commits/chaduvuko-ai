import mammoth from 'mammoth';
import { extractText } from 'unpdf';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt']);
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function validateResumeFile(fileName: string, mimeType: string, size: number): void {
  if (size <= 0 || size > MAX_RESUME_FILE_SIZE) {
    throw new Error('Resume file must be between 1 byte and 5 MB.');
  }
  const lower = fileName.toLowerCase();
  const hasAllowedExt = Array.from(ALLOWED_EXTENSIONS).some((ext) => lower.endsWith(ext));
  const hasAllowedMime = ALLOWED_MIMES.has(mimeType);

  if (!hasAllowedExt && !hasAllowedMime) {
    throw new Error('Unsupported file format. Please upload a PDF, DOCX, or TXT resume.');
  }
}

export async function extractResumeText(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  validateResumeFile(fileName, mimeType, buffer.length);
  const lower = fileName.toLowerCase();

  let rawText = '';

  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
    const result = await extractText(new Uint8Array(buffer), { mergePages: true });
    rawText = Array.isArray(result.text) ? result.text.join('\n') : String(result.text || '');
  } else if (
    lower.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value || '';
  } else {
    rawText = buffer.toString('utf-8');
  }

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length < 40) {
    throw new Error(
      'We could not extract readable text from this file. If it is a scanned image PDF, please upload a text-based PDF/DOCX or paste your resume text.'
    );
  }
  return normalized.slice(0, 40000);
}
