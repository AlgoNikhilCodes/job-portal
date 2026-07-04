import fs from 'fs/promises';
import fsSync from 'fs';
import Resume from '../models/Resume.js';
import SeekerProfile from '../models/SeekerProfile.js';
import { extractTextFromPDF, parseResumeText } from '../services/resumeParsingService.js';

const ts = () => new Date().toISOString();

// Merge resume-extracted skills into the seeker's profile without discarding
// anything they typed in manually — a fresh resume upload should ADD to what
// a seeker already told us, not silently erase it.
const mergeSkills = (existing = [], incoming = []) => {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const merged = [...existing];
  for (const skill of incoming) {
    if (!seen.has(skill.toLowerCase())) {
      seen.add(skill.toLowerCase());
      merged.push(skill);
    }
  }
  return merged;
};

// POST /api/resumes/upload — multer's uploadSingle('resume') middleware runs first
export const uploadResume = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      // Clean up the file multer already wrote before rejecting, so we
      // don't leave orphaned uploads for a role that isn't allowed to use this.
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({ message: 'Only seekers can upload a resume' });
    }

    let extractedText;
    try {
      extractedText = await extractTextFromPDF(req.file.path);
    } catch (extractError) {
      // Extraction failed (corrupted/scanned PDF) — remove the unusable
      // file rather than leaving a Resume record with no usable content.
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: extractError.message });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        message: 'No readable text was found in this PDF. It may be a scanned image rather than a text document — please upload a text-based PDF.',
      });
    }

    const parsedData = parseResumeText(extractedText);

    // Replace any previous resume file+record for this seeker (one resume
    // per seeker, matches the unique index on Resume.seekerId).
    const previous = await Resume.findOne({ seekerId: req.user._id });
    if (previous && previous.filePath && previous.filePath !== req.file.path) {
      await fs.unlink(previous.filePath).catch(() => {});
    }

    const resume = await Resume.findOneAndUpdate(
      { seekerId: req.user._id },
      {
        seekerId: req.user._id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        extractedText,
        parsedData,
        uploadedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Auto-populate the seeker's profile — merge skills, refresh experience,
    // and only fill education/summary if the seeker hadn't already written
    // their own (never overwrite something they deliberately typed there).
    const profile = await SeekerProfile.findOne({ userId: req.user._id });
    const profileUpdate = {
      resumeParsedSkills: parsedData.skills,
      resumeExperience: parsedData.experience,
      resumeLastUpdated: new Date(),
      skills: mergeSkills(profile?.skills, parsedData.skills),
    };
    if (parsedData.experience && !profile?.experience) {
      profileUpdate.experience = parsedData.experience;
    }
    if (parsedData.education && !profile?.education) {
      profileUpdate.education = parsedData.education;
    }
    if (parsedData.summary && !profile?.summary) {
      profileUpdate.summary = parsedData.summary;
    }

    await SeekerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: profileUpdate, $setOnInsert: { userId: req.user._id } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      resume: {
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        parsedData: resume.parsedData,
        uploadedAt: resume.uploadedAt,
        isPublic: resume.isPublic,
      },
    });
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    console.error(`[${ts()}] uploadResume error:`, error);
    res.status(500).json({ message: 'Something went wrong while processing your resume. Please try again.' });
  }
};

// GET /api/resumes — seeker views their own resume record
export const getResume = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view their resume' });
    }

    const resume = await Resume.findOne({ seekerId: req.user._id });
    res.json(resume || null);
  } catch (error) {
    console.error(`[${ts()}] getResume error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching your resume. Please try again.' });
  }
};

// GET /api/resumes/download — seeker downloads their own PDF
export const downloadResume = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can download their resume' });
    }

    const resume = await Resume.findOne({ seekerId: req.user._id });
    if (!resume || !fsSync.existsSync(resume.filePath)) {
      return res.status(404).json({ message: 'No resume found. Please upload one first.' });
    }

    res.download(resume.filePath, resume.fileName);
  } catch (error) {
    console.error(`[${ts()}] downloadResume error:`, error);
    res.status(500).json({ message: 'Something went wrong while downloading your resume. Please try again.' });
  }
};

// GET /api/resumes/download/:seekerId — recruiter downloads an applicant's actual PDF.
// Not in the original route list but needed for the "download" buttons in the
// applications table / resume view page to actually do something — gated to
// recruiters and to resumes the seeker has made public, same rule as the preview.
export const downloadResumeForRecruiter = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can download applicant resumes' });
    }

    const resume = await Resume.findOne({ seekerId: req.params.seekerId });
    if (!resume || !fsSync.existsSync(resume.filePath)) {
      return res.status(404).json({ message: 'No resume found for this applicant.' });
    }
    if (!resume.isPublic) {
      return res.status(403).json({ message: 'This seeker has kept their resume private.' });
    }

    res.download(resume.filePath, resume.fileName);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Resume not found. Please check the URL and try again.' });
    }
    console.error(`[${ts()}] downloadResumeForRecruiter error:`, error);
    res.status(500).json({ message: 'Something went wrong while downloading this resume. Please try again.' });
  }
};

// GET /api/resumes/preview/:seekerId — public, recruiter-safe (no contact info)
export const getResumePreview = async (req, res) => {
  try {
    const resume = await Resume.findOne({ seekerId: req.params.seekerId });
    if (!resume) {
      return res.status(404).json({ message: 'This seeker has not uploaded a resume yet.' });
    }
    if (!resume.isPublic) {
      return res.status(403).json({ message: 'This seeker has kept their resume private.' });
    }

    // Deliberately omit email/phone/extractedText from the public preview.
    res.json({
      name: resume.parsedData.name,
      skills: resume.parsedData.skills,
      experience: resume.parsedData.experience,
      education: resume.parsedData.education,
      summary: resume.parsedData.summary,
      uploadedAt: resume.uploadedAt,
      isPublic: resume.isPublic,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Resume not found. Please check the URL and try again.' });
    }
    console.error(`[${ts()}] getResumePreview error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching this resume. Please try again.' });
  }
};

// GET /api/resumes/application/:seekerId — protected, recruiter only
// Full resume detail (including contact info) — intended to only be reachable
// from an application-review context, so it's gated to authenticated recruiters
// rather than being fully public like getResumePreview.
export const getResumeForApplication = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can view full applicant resumes' });
    }

    const resume = await Resume.findOne({ seekerId: req.params.seekerId });
    if (!resume) {
      return res.status(404).json({ message: 'This applicant has not uploaded a resume yet.' });
    }

    res.json({
      fileName: resume.fileName,
      parsedData: resume.parsedData,
      uploadedAt: resume.uploadedAt,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Resume not found. Please check the URL and try again.' });
    }
    console.error(`[${ts()}] getResumeForApplication error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching this resume. Please try again.' });
  }
};

// DELETE /api/resumes — seeker only
export const deleteResume = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can delete their resume' });
    }

    const resume = await Resume.findOneAndDelete({ seekerId: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: 'No resume found to delete.' });
    }

    if (resume.filePath) {
      await fs.unlink(resume.filePath).catch((err) =>
        console.error(`[${ts()}] Failed to remove resume file ${resume.filePath}:`, err.message)
      );
    }

    res.json({ message: 'Resume deleted' });
  } catch (error) {
    console.error(`[${ts()}] deleteResume error:`, error);
    res.status(500).json({ message: 'Something went wrong while deleting your resume. Please try again.' });
  }
};

// PUT /api/resumes/public — seeker only
export const updateResumePublicity = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can manage resume visibility' });
    }

    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'isPublic must be true or false' });
    }

    const resume = await Resume.findOneAndUpdate(
      { seekerId: req.user._id },
      { isPublic },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: 'Please upload a resume before changing its visibility.' });
    }

    res.json(resume);
  } catch (error) {
    console.error(`[${ts()}] updateResumePublicity error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating your resume visibility. Please try again.' });
  }
};
