import { extractText, getDocumentProxy } from 'unpdf';

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_MAX_PAGES = 120;
const DEFAULT_MAX_IMAGE_PIXELS = 16_777_216;
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_TEXT = 1_200_000;

export type PdfTextQualityReason =
  | 'empty'
  | 'too_short'
  | 'binary_like'
  | 'insufficient_words'
  | 'mojibake'
  | 'low_letter_ratio'
  | 'low_coverage';

export type PdfTextQuality = {
  readable: boolean;
  score: number;
  reason?: PdfTextQualityReason;
  characters: number;
  words: number;
  letterRatio: number;
};

export type PdfPageExtraction = {
  pageNumber: number;
  text: string;
  quality: PdfTextQuality;
};

export type PdfDocumentExtraction = {
  text: string;
  pages: PdfPageExtraction[];
  totalPages: number;
  readablePages: number;
  pageCoverage: number;
  quality: PdfTextQuality;
  method: 'pdfjs_text' | 'pdfjs_low_confidence' | 'no_text_layer';
  hasUsableText: boolean;
  requiresAiDocumentVision: boolean;
  warnings: string[];
};

export type PdfExtractionOptions = {
  maxBytes?: number;
  maxPages?: number;
  maxImagePixels?: number;
  timeoutMs?: number;
  maxText?: number;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeText(input: string, maxText: number) {
  return input
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxText);
}

/**
 * Language-neutral readability assessment.
 *
 * Do not rely on English keywords. OPSIQO must support multilingual
 * HR material including Arabic and other Unicode scripts.
 */
export function assessPdfTextQuality(input: string): PdfTextQuality {
  const text = input.replace(/\s+/g, ' ').trim();

  if (!text) {
    return {
      readable: false,
      reason: 'empty',
      score: 0,
      characters: 0,
      words: 0,
      letterRatio: 0,
    };
  }

  const visible = [...text].filter((char) => !/\s/u.test(char));
  const letters = visible.filter((char) => /\p{L}/u.test(char)).length;

  const controls = visible.filter((char) =>
    /[\u0000-\u001f\u007f-\u009f\ufffd]/u.test(char),
  ).length;

  const mojibake = visible.filter((char) => /[ÃÂ�]/u.test(char)).length;

  const words =
    text.match(/[\p{L}\p{N}][\p{L}\p{N}'’._@+#&/-]{1,}/gu) ?? [];

  const characters = visible.length;
  const letterRatio = letters / Math.max(1, characters);
  const controlRatio = controls / Math.max(1, characters);
  const mojibakeRatio = mojibake / Math.max(1, characters);

  const lengthScore = Math.min(1, text.length / 500);
  const wordScore = Math.min(1, words.length / 30);

  const score = clamp(
    letterRatio * 0.5 +
      wordScore * 0.3 +
      lengthScore * 0.2 -
      controlRatio * 4 -
      mojibakeRatio * 4,
  );

  if (text.length < 40) {
    return {
      readable: false,
      reason: 'too_short',
      score,
      characters,
      words: words.length,
      letterRatio,
    };
  }

  if (controlRatio > 0.01) {
    return {
      readable: false,
      reason: 'binary_like',
      score,
      characters,
      words: words.length,
      letterRatio,
    };
  }

  if (mojibakeRatio > 0.015) {
    return {
      readable: false,
      reason: 'mojibake',
      score,
      characters,
      words: words.length,
      letterRatio,
    };
  }

  if (letterRatio < 0.35) {
    return {
      readable: false,
      reason: 'low_letter_ratio',
      score,
      characters,
      words: words.length,
      letterRatio,
    };
  }

  if (words.length < 6) {
    return {
      readable: false,
      reason: 'insufficient_words',
      score,
      characters,
      words: words.length,
      letterRatio,
    };
  }

  return {
    readable: score >= 0.48,
    reason: score >= 0.48 ? undefined : 'binary_like',
    score,
    characters,
    words: words.length,
    letterRatio,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  operation: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `PDF ${operation} exceeded the ${milliseconds} ms safety timeout.`,
            ),
          );
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function assertPdf(bytes: Buffer, maxBytes: number) {
  if (bytes.length <= 0) {
    throw new Error('PDF file is empty.');
  }

  if (bytes.length > maxBytes) {
    throw new Error(
      `PDF exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB processing limit.`,
    );
  }

  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('Invalid PDF signature.');
  }
}

/**
 * Authoritative shared OPSIQO PDF text-layer extractor.
 *
 * Important:
 * - absence of reliable text is NOT treated as a corrupt document;
 * - scanned/image PDFs return requiresAiDocumentVision=true;
 * - consumers may then send the ORIGINAL PDF to the governed AI provider;
 * - no authoritative HR write may occur solely from low-confidence extraction.
 */
export async function extractPdfDocument(
  bytes: Buffer,
  options: PdfExtractionOptions = {},
): Promise<PdfDocumentExtraction> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxImagePixels =
    options.maxImagePixels ?? DEFAULT_MAX_IMAGE_PIXELS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxText = options.maxText ?? DEFAULT_MAX_TEXT;

  assertPdf(bytes, maxBytes);

  /*
   * Copy the Buffer into a plain Uint8Array.
   * This avoids sharing Buffer-specific backing state with PDF.js.
   */
  const data = new Uint8Array(bytes);

  const pdf = await withTimeout(
    getDocumentProxy(data, {
      maxImageSize: maxImagePixels,
    }),
    timeoutMs,
    'document load',
  );

  try {
    const totalPages = Number(pdf.numPages || 0);

    if (totalPages < 1) {
      throw new Error('PDF contains no pages.');
    }

    if (totalPages > maxPages) {
      throw new Error(
        `PDF contains ${totalPages} pages; OPSIQO processing limit is ${maxPages}.`,
      );
    }

    const extracted = await withTimeout(
      extractText(pdf, { mergePages: false }),
      timeoutMs,
      'text extraction',
    );

    const rawPages = Array.isArray(extracted.text)
      ? extracted.text
      : [String(extracted.text || '')];

    const pages: PdfPageExtraction[] = [];

    for (let i = 0; i < totalPages; i += 1) {
      const text = normalizeText(String(rawPages[i] || ''), maxText);
      pages.push({
        pageNumber: i + 1,
        text,
        quality: assessPdfTextQuality(text),
      });
    }

    const readablePages = pages.filter(
      (page) => page.quality.readable,
    ).length;

    const pageCoverage = readablePages / Math.max(1, totalPages);

    const text = normalizeText(
      pages
        .map((page) => page.text)
        .filter(Boolean)
        .join('\n\n'),
      maxText,
    );

    const quality = assessPdfTextQuality(text);

    const hasUsableText =
      quality.readable &&
      pageCoverage >= 0.5;

    const warnings: string[] = [];

    if (!text) {
      warnings.push(
        'No usable PDF text layer was detected. The document may be scanned or image-based.',
      );
    } else if (!quality.readable) {
      warnings.push(
        'The PDF contains text, but the extracted text did not meet OPSIQO readability requirements.',
      );
    }

    if (pageCoverage < 0.5 && totalPages > 1) {
      warnings.push(
        `Only ${readablePages} of ${totalPages} pages contained reliable text.`,
      );
    }

    /*
     * A PDF can have some text plus critical visual/table/image content.
     * Low coverage therefore escalates the ORIGINAL document to AI.
     */
    const requiresAiDocumentVision =
      !hasUsableText ||
      pageCoverage < 0.75;

    const method: PdfDocumentExtraction['method'] =
      !text
        ? 'no_text_layer'
        : hasUsableText
          ? 'pdfjs_text'
          : 'pdfjs_low_confidence';

    return {
      text,
      pages,
      totalPages,
      readablePages,
      pageCoverage,
      quality,
      method,
      hasUsableText,
      requiresAiDocumentVision,
      warnings,
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}

export async function extractPdfText(
  bytes: Buffer,
  options: PdfExtractionOptions = {},
): Promise<string> {
  const result = await extractPdfDocument(bytes, options);
  return result.hasUsableText ? result.text : '';
}
