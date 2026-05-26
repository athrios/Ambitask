-- Add shared_modules column to workspaces
-- Controls which module data is visible across all workspaces owned by the same user.
-- Example: ['clientes'] means the Clientes list of this workspace is visible in all other
-- workspaces owned by the same user (read-only, with a workspace badge).

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS shared_modules text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN workspaces.shared_modules IS
  'List of module keys (e.g. ''clientes'') whose data is exposed (read-only) to all other workspaces of the same owner.';
