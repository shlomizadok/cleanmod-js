# Publishing Guide

## Prerequisites

1. **Commit all changes first** - `npm version` requires a clean working directory
2. **Ensure you're logged in** - Run `npm login` if needed

## Publishing Workflow

### Option 1: Manual Step-by-Step (Recommended for first time)

```bash
# 1. Make sure all changes are committed
git status  # Should show "nothing to commit, working tree clean"

# 2. Bump version, create commit, and tag (all in one step)
npm version patch   # or: minor, major

# This automatically:
# - Updates package.json version
# - Creates a git commit with message "v0.1.6" (or similar)
# - Creates a git tag "v0.1.6"

# 3. Build (already runs via prepublishOnly, but you can verify)
npm run build

# 4. Login to npm (if not already logged in)
npm login

# 5. Publish to npm
npm publish

# 6. Push commit and tag to remote
git push
git push --tags
```

### Option 2: Automated Scripts

```bash
# For patch version (0.1.5 -> 0.1.6)
npm run publish:patch

# For minor version (0.1.5 -> 0.2.0)
npm run publish:minor

# For major version (0.1.5 -> 1.0.0)
npm run publish:major
```

**Note:** The automated scripts will:
- Bump version and create commit/tag
- Build the package
- Publish to npm
- Push commit and tags to git

Make sure you're logged in to npm before running these scripts.

## Important Notes

1. **`npm version patch` automatically:**
   - Updates `package.json` version
   - Creates a git commit with the version change
   - Creates a git tag (e.g., `v0.1.6`)
   - **Requires a clean working directory** (all changes must be committed first)

2. **`prepublishOnly` hook:**
   - Automatically runs `pnpm run build` before publishing
   - Ensures the latest code is built

3. **Version bump types:**
   - `patch`: 0.1.5 → 0.1.6 (bug fixes)
   - `minor`: 0.1.5 → 0.2.0 (new features, backward compatible)
   - `major`: 0.1.5 → 1.0.0 (breaking changes)

## Troubleshooting

- **"Working directory not clean" error**: Commit all changes first with `git add . && git commit -m "Your message"`
- **"You must be logged in" error**: Run `npm login` first
- **Tag already exists**: Delete the tag with `git tag -d v0.1.6` and try again

