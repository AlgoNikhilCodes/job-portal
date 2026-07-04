// pdf-parse v2 pulls in the full pdfjs-dist "legacy" build, which references
// browser-only globals (DOMMatrix, Path2D, etc.) that don't exist in plain
// Node.js and crash on import outside a browser/canvas-polyfilled environment.
// v1 is a much thinner wrapper around pdf.js's text extraction only and has
// none of that baggage, so we deliberately pin to v1 here (see package.json).
//
// We import pdf-parse's inner lib file directly rather than the package
// root. The package root (index.js) has a long-standing bug: it checks
// `!module.parent` to decide whether it's being run as a standalone script
// (for the maintainer's own manual testing) vs required as a library — but
// under ESM, `module.parent` is never set even when imported normally, so
// that check is always true. That makes it try to self-test against a
// fixture PDF that doesn't exist in our project and crash on startup.
// Importing straight from lib/pdf-parse.js skips that broken entry point
// entirely and gets just the actual parsing function.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs/promises';

const ts = () => new Date().toISOString();

/**
 * Extracts raw text from a PDF file on disk.
 */
export const extractTextFromPDF = async (filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch (error) {
    console.error(`[${ts()}] PDF text extraction failed for ${filePath}:`, error.message);
    throw new Error('Could not read this PDF. It may be corrupted, password-protected, or scanned as images rather than text.');
  }
};

// ─── Regex building blocks ──────────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
// Matches "9876543210", "987-654-3210", "+91 98765 43210", "(987) 654-3210", etc.
// Built as "optional country code, optional parenthesized area code, then a
// run of 7-14 more digits with optional separators" rather than trying to
// hardcode every regional grouping (987-654-3210 vs 98765-43210 vs
// 98765 43210 all represent the same digit count split differently).
const PHONE_REGEX = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?(?:\d[\s.-]?){6,13}\d/;

// Section header names we look for, in the order they commonly appear.
const SECTION_NAMES = ['summary', 'objective', 'skills', 'technical skills', 'experience', 'work experience', 'work history', 'education', 'projects', 'certifications'];

/**
 * Finds the block of text between a named section header and the next
 * recognized section header (or end of document). Resumes have no fixed
 * structure, so this is inherently best-effort — it looks for a line that
 * is *just* the header (optionally followed by a colon) rather than the
 * word appearing incidentally inside a sentence.
 */
const extractSection = (text, sectionName) => {
  const lines = text.split('\n');
  const headerRegex = new RegExp(`^\\s*${sectionName}\\s*:?\\s*$`, 'i');
  const startIndex = lines.findIndex((line) => headerRegex.test(line));
  if (startIndex === -1) return '';

  const otherHeaders = SECTION_NAMES.filter((s) => s.toLowerCase() !== sectionName.toLowerCase());
  const endOffset = lines
    .slice(startIndex + 1)
    .findIndex((line) => otherHeaders.some((s) => new RegExp(`^\\s*${s}\\s*:?\\s*$`, 'i').test(line)));

  const endIndex = endOffset === -1 ? lines.length : startIndex + 1 + endOffset;
  return lines.slice(startIndex + 1, endIndex).join('\n').trim();
};

/**
 * Extracts a skills array from a resume's "Skills" section. Handles both
 * comma-separated ("React, Node.js, MongoDB") and bullet/newline-separated
 * ("- React\n- Node.js") formats, since resumes use either interchangeably.
 */
export const extractSkillsFromText = (text) => {
  const section = extractSection(text, 'technical skills') || extractSection(text, 'skills');
  if (!section) return [];

  // Split on commas, bullets, pipes, or newlines — whichever the resume used.
  const rawItems = section
    .split(/[,•\n|]/)
    .map((s) => s.replace(/^[-*•\s]+/, '').trim())
    .filter(Boolean);

  // De-dupe case-insensitively while preserving the first-seen casing.
  const seen = new Set();
  const skills = [];
  for (const item of rawItems) {
    // Guard against accidentally swallowing a whole sentence if the section
    // detection over-matched (e.g. no clear delimiters at all) — real skill
    // tokens are short.
    if (item.length === 0 || item.length > 40) continue;
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      skills.push(item);
    }
  }
  return skills.slice(0, 30);
};

/**
 * Estimates total years of professional experience by scanning for year
 * ranges (e.g. "2019 - 2022", "2020-Present") anywhere in the text and
 * summing the non-overlapping span they cover. This is necessarily a rough
 * heuristic — resumes don't follow a single standard format — so it's
 * presented to the user as an editable starting point, not a fact.
 */
export const calculateExperienceYears = (text) => {
  const rangeRegex = /(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(present|current|now|(20\d{2}|19\d{2}))/gi;
  const currentYear = new Date().getFullYear();

  let totalMonths = 0;
  const matches = [...text.matchAll(rangeRegex)];

  for (const match of matches) {
    const start = parseInt(match[1], 10);
    const endRaw = match[2];
    const end = /present|current|now/i.test(endRaw) ? currentYear : parseInt(endRaw, 10);
    if (end >= start && end - start < 50) {
      totalMonths += (end - start) * 12;
    }
  }

  if (totalMonths > 0) {
    return Math.round((totalMonths / 12) * 10) / 10;
  }

  // Fallback: a single explicit "X years of experience" statement
  const explicitMatch = text.match(/(\d+(?:\.\d+)?)\s*\+?\s*years?\s+(?:of\s+)?experience/i);
  if (explicitMatch) return parseFloat(explicitMatch[1]);

  return 0;
};

/**
 * Best-effort extraction of the candidate's name. Resumes almost always
 * lead with the name on the very first non-empty line, well before any
 * contact details — so we take that line as long as it doesn't look like
 * an email/phone/section header itself.
 */
const extractName = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (EMAIL_REGEX.test(line)) continue;
    if (PHONE_REGEX.test(line) && line.replace(/\D/g, '').length >= 7) continue;
    if (SECTION_NAMES.some((s) => new RegExp(`^\\s*${s}\\s*:?\\s*$`, 'i').test(line))) continue;
    if (line.length > 60) continue; // too long to be just a name
    return line;
  }
  return '';
};

/**
 * Parses raw resume text into structured fields. Every extractor here is
 * independent and best-effort — a failure/miss on one field never prevents
 * the others from being returned, since partial data is still useful and
 * the seeker can always correct it manually afterward.
 */
export const parseResumeText = (text) => {
  const emailMatch = text.match(EMAIL_REGEX);
  const phoneMatch = text.match(PHONE_REGEX);

  const summary = extractSection(text, 'summary') || extractSection(text, 'objective');
  const education = extractSection(text, 'education');

  return {
    name: extractName(text),
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].trim() : '',
    skills: extractSkillsFromText(text),
    experience: calculateExperienceYears(text),
    education: education.slice(0, 500),
    summary: summary.slice(0, 800),
  };
};

export default { extractTextFromPDF, parseResumeText, calculateExperienceYears, extractSkillsFromText };
