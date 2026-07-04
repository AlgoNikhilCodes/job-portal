// Compares a seeker's resume skills against a job's required skills.
// Case-insensitive so "react" and "React" count as the same skill.
export const calculateJobMatch = (resumeSkills = [], jobRequiredSkills = []) => {
  if (!jobRequiredSkills || jobRequiredSkills.length === 0) {
    return { matchPercentage: 0, matchedSkills: [], missingSkills: [] };
  }

  const resumeLower = resumeSkills.map((s) => s.toLowerCase());

  const matchedSkills = jobRequiredSkills.filter((skill) => resumeLower.includes(skill.toLowerCase()));
  const missingSkills = jobRequiredSkills.filter((skill) => !resumeLower.includes(skill.toLowerCase()));

  const matchPercentage = Math.round((matchedSkills.length / jobRequiredSkills.length) * 100);

  return { matchPercentage, matchedSkills, missingSkills };
};

export default calculateJobMatch;
