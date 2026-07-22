# Changelog Entries

This directory contains append-only source entries for the generated changelog.

- Only the parent orchestrator writes final entries and generated surfaces.
- Add one entry with:
  `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh add --project <project> ...`
- Reconcile a wave with:
  `bash .agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh batch-closeout --input <drafts.jsonl>`
- Generated outputs (under the configured ledger dir; default `.changelog/`):
  - `CHANGELOG.md`: latest 100 entries (repo root).
  - `CHANGELOG-FULL.md`: complete history (repo root).
  - `.changelog/index.md`: complete searchable table.
  - `.changelog/views/*.md`: project-specific views for classified entries.
  - `.changelog/releases/*.md`: explicit immutable milestone snapshots.
  Compat: when `docs/changelog` is a symlink to `../.changelog`, relative reads
  of those paths still resolve; new docs cite `.changelog/` as the write root.
