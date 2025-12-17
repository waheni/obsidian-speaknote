# Release Checklist for SpeakNote Plugin

This checklist will help you prepare for submitting your plugin to the Obsidian Community Plugins directory.

## Pre-Release Checklist

### 1. Code Quality
- [x] Run ESLint to check for issues: `npm run lint`
- [x] Fix all ESLint errors (warnings are acceptable)
- [ ] Test all plugin features thoroughly
- [ ] Remove any console.log statements used for debugging
- [ ] Review code for security issues (API keys, sensitive data)

### 2. Version & Manifest
- [ ] Update version in `manifest.json` (e.g., "0.2.0" without "v" prefix)
- [ ] Update version in `package.json` to match
- [ ] Ensure `minAppVersion` in `manifest.json` is correct
- [ ] Verify plugin `id`, `name`, `author`, and `description` are accurate
- [ ] Check that `authorUrl` points to your GitHub profile

### 3. Documentation
- [ ] Update README.md with:
  - Clear description of what the plugin does
  - Installation instructions
  - Usage instructions with examples
  - Configuration/settings guide
  - Screenshots or GIFs demonstrating features
  - Known issues or limitations
  - Support/contact information
- [ ] Verify LICENSE file is present and correct
- [ ] Add CHANGELOG.md documenting version changes

### 4. Testing
Test the plugin on multiple platforms:
- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] Mobile (Android) - if applicable
- [ ] Mobile (iOS) - if applicable

Test scenarios:
- [ ] Fresh installation
- [ ] Plugin settings save correctly
- [ ] All commands work as expected
- [ ] No console errors in normal operation
- [ ] Performance is acceptable
- [ ] Memory leaks check (long-running usage)

### 5. Build for Release
```bash
# Build the plugin
npm run build

# Verify these files exist and are up to date:
# - main.js
# - manifest.json
# - styles.css (if applicable)
```

- [ ] Verify `main.js` is generated and works
- [ ] Check file sizes are reasonable
- [ ] Test the built version in Obsidian

## Creating a GitHub Release

### 1. Prepare Repository
```bash
# Commit all changes
git add .
git commit -m "Release version 0.2.0"

# Create and push tag (NO "v" prefix for Obsidian!)
git tag 0.2.0
git push origin main
git push origin 0.2.0
```

### 2. Create GitHub Release
1. Go to https://github.com/waheni/obsidian-speaknote/releases
2. Click "Draft a new release"
3. Fill in the details:
   - **Tag**: Select the tag you just created (e.g., `0.2.0`)
   - **Release title**: Same as tag (e.g., `0.2.0`) - NO "v" prefix!
   - **Description**: Copy from CHANGELOG.md or write release notes
4. Upload required files as separate attachments:
   - `main.js`
   - `manifest.json`
   - `styles.css` (if you have custom styles)
5. Click "Publish release"

**Important**: The release name MUST exactly match the version in `manifest.json` (without "v" prefix)

## Submitting to Obsidian Community Plugins

### 1. Fork the obsidian-releases repository
1. Go to https://github.com/obsidianmd/obsidian-releases
2. Fork the repository to your account

### 2. Add your plugin to community-plugins.json
1. Clone your fork locally
2. Open `community-plugins.json`
3. Add your plugin entry (alphabetically by ID):
```json
{
  "id": "speaknote",
  "name": "SpeakNote",
  "author": "Neurahex (Heni Wael)",
  "description": "Record voice notes and auto-transcribe them to markdown using Deepgram, AssemblyAI, or OpenAI Whisper.",
  "repo": "waheni/obsidian-speaknote"
}
```

### 3. Create Pull Request
1. Commit your changes
2. Push to your fork
3. Create a Pull Request to obsidian-releases
4. Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`
5. Fill out all checklist items

### 4. Wait for Review
- The Obsidian team will review your submission
- Address any feedback or requested changes
- Be responsive to comments

## Post-Release

- [ ] Monitor GitHub issues for bug reports
- [ ] Respond to user questions
- [ ] Plan next version features
- [ ] Keep dependencies updated

## Version Numbering Guide

Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backwards compatible (e.g., 0.2.0 → 0.3.0)
- **PATCH**: Bug fixes (e.g., 0.2.0 → 0.2.1)

## Common Issues

### Release name doesn't match manifest.json
- ❌ Wrong: `v0.2.0`
- ✅ Correct: `0.2.0`

### Missing files in release
Make sure to upload `main.js` and `manifest.json` as individual files, not just in the source archive.

### Plugin ID mismatch
The `id` in `manifest.json` must match the `id` in `community-plugins.json`.

## Resources

- [Obsidian Developer Policies](https://docs.obsidian.md/Developer+policies)
- [Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [Submit Your Plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Obsidian API Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
