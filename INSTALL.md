# INSTALL / REPLACE EXISTING REPO CONTENTS

Target local repository:
`C:\Users\Ikhsan Radiansyah\Documents\GitHub\porto`

## Important

Do **not** delete the hidden `.git` directory.

If `.git` is deleted, the folder is no longer a Git repository and GitHub Desktop / `git commit` will not work until the repository is cloned again.

## Recommended replacement steps

1. Open the local `porto` repository folder.
2. Enable hidden items in Windows Explorer if needed.
3. Keep the `.git` directory.
4. Delete the old website files and folders other than `.git`.
5. Copy or extract the current repository snapshot.
6. Copy all extracted files directly into the `porto` repository root.
7. Review changes in GitHub Desktop.
8. Commit with a descriptive message.
9. Push to `main`.

The HTML references versioned assets ending in `20260819-valuation-v1` and `20260819-en`, so Cloudflare/browser cache should request new CSS/JS URLs.
