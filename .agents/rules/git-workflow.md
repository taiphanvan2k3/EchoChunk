# Git Workflow & Project Rules for EchoChunk

## 1. Branch Naming Convention
All new work must be created on a dedicated branch with clear standard prefixes:
- `feat/<feature-description>`: New features or major architectural additions.
- `fix/<bug-description>`: Bug fixes and regression repairs.
- `chore/<task-description>`: Maintenance, dependency updates, and configuration adjustments.
- `refactor/<refactor-description>`: Code restructuring without feature changes.

## 2. Commit Message Convention
Follow Conventional Commits:
- `feat: <description>`
- `fix: <description>`
- `chore: <description>`
- `docs: <description>`
- `refactor: <description>`

## 3. Pull Request / Merge Request Workflow
- Work on a dedicated branch prefixed with `feat/`, `fix/`, or `chore/`.
- Ensure `pnpm tsc --noEmit` and `pnpm lint` pass cleanly with 0 errors before committing.
- Commit all related changes cleanly.
- Push the branch to GitHub origin and provide the PR creation link.

## 4. Architecture & Design Rules
- **Multi-User Data Isolation**: Never share local storage keys across users. Partition by UID (`${key}_${uid}`) and always filter Firestore queries with `userId == user.uid`.
- **Vietnamese URL Rewrites**: Route definitions remain in English (`/shadowing`, `/blanks`, `/reflex`, `/explorer`), while public facing URLs in Vietnamese (`/luyen-noi`, `/dien-tu`, `/phan-xa`, `/kho-tu-vung`) are configured via Next.js `rewrites()` in `next.config.ts`.
- **Typography**: Always use proportional fonts (`--font-ipa`) for phonetic transcriptions (IPA) so syllable stress marks hug naturally without monospace gaps.
