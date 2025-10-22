# 🔧 How to Merge the 404 Fix Yourself

## Prerequisites

You need:
- Terminal/Command Prompt access
- Git installed on your computer
- Access to push to the `main` branch

---

## Step-by-Step Instructions

### Step 1: Open Terminal

**On Mac/Linux:**
- Open Terminal app

**On Windows:**
- Open Git Bash or Command Prompt

---

### Step 2: Navigate to Your Project

```bash
cd /path/to/keywordfoundrypro
```

Replace `/path/to/keywordfoundrypro` with the actual path where your project is located.

**Example:**
- Mac: `cd ~/Documents/keywordfoundrypro`
- Windows: `cd C:\Users\YourName\Documents\keywordfoundrypro`

---

### Step 3: Run These Commands (One at a Time)

Copy and paste each command, press Enter, wait for it to complete before running the next one:

#### Command 1: Switch to main branch
```bash
git checkout main
```

**Expected output:**
```
Switched to branch 'main'
```

---

#### Command 2: Get latest changes
```bash
git pull origin main
```

**Expected output:**
```
Already up to date.
```
or
```
Updating 446548c..xxxxx
```

---

#### Command 3: Merge the fix
```bash
git merge claude/analyze-loveable-project-011CULFteLQCNig6JKdAK7dM
```

**Expected output:**
```
Updating 446548c..07e1a2d
Fast-forward
 src/lib/researchHome.ts | 64 +++++++++++++++++++++-------------------
 1 file changed, 35 insertions(+), 29 deletions(-)
```

**If you see conflicts:**
```
Auto-merging src/lib/researchHome.ts
CONFLICT (content): Merge conflict in src/lib/researchHome.ts
```

Then run:
```bash
git merge --abort
```
And use **Option 1 (Loveable.dev)** instead.

---

#### Command 4: Push to GitHub
```bash
git push origin main
```

**Expected output:**
```
Counting objects: 5, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (5/5), done.
Writing objects: 100% (5/5), 1.23 KiB | 1.23 MiB/s, done.
Total 5 (delta 3), reused 0 (delta 0)
To https://github.com/WebFoundryAI/keywordfoundrypro.git
   446548c..07e1a2d  main -> main
```

---

## Step 4: Verify Deployment

1. **Wait 1-2 minutes** for Loveable.dev to auto-deploy
2. **Go to:** https://keywordfoundrypro.com/
3. **Click:** "Get Started Now" button
4. **Should redirect to:** Keyword research page (NOT 404!)

---

## Troubleshooting

### Problem: "Permission denied"

**Error:**
```
error: RPC failed; HTTP 403
```

**Solution:** You may not have push permissions. Use **Option 1 (Loveable.dev)** instead.

---

### Problem: "Merge conflict"

**Error:**
```
CONFLICT (content): Merge conflict in src/lib/researchHome.ts
```

**Solution:**
```bash
git merge --abort
```
Then use **Option 1 (Loveable.dev)** instead.

---

### Problem: "Branch not found"

**Error:**
```
error: pathspec 'claude/analyze-loveable-project-011CULFteLQCNig6JKdAK7dM' did not match any file(s) known to git
```

**Solution:**
First fetch the branch:
```bash
git fetch origin claude/analyze-loveable-project-011CULFteLQCNig6JKdAK7dM
git merge claude/analyze-loveable-project-011CULFteLQCNig6JKdAK7dM
```

---

## What Gets Changed

**File:** `src/lib/researchHome.ts`

**Before:**
```typescript
return `/app/research/${newSpace.id}`; // 404 error
```

**After:**
```typescript
return '/app/keyword-research'; // Works!
```

---

## Need Help?

If any command fails or you're unsure, just:

1. Stop where you are
2. Use **Option 1** instead (Loveable.dev prompt)
3. It's faster and guaranteed to work!

---

**Created:** October 21, 2025
**Fix:** Homepage "Get Started Now" button 404 error
