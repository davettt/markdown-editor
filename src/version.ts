/**
 * Version information for the Markdown Editor
 * Update this file when releasing a new version
 */

export const VERSION = "1.0.0";
export const VERSION_INFO = {
  major: 1,
  minor: 0,
  patch: 0,
};

export function getVersionString(): string {
  return `${VERSION_INFO.major}.${VERSION_INFO.minor}.${VERSION_INFO.patch}`;
}
