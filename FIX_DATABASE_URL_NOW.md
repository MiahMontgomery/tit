# URGENT: Fix DATABASE_URL in Render

## The Problem

Your `DATABASE_URL` in Render has the database name set to a connection string instead of just the database name.

**Current (WRONG)**:
```
postgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db_bi9npostgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db_bi9n
```

**Should be (CORRECT)**:
```
postgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db
```

## How to Fix (5 minutes)

1. **Go to Render Dashboard** → Your PostgreSQL database service
2. **Find "Internal Database URL"** or "Connection String"
3. **Copy the ENTIRE connection string** - it should look like:
   ```
   postgresql://titan_db_bi9n_user:162mEM7Gm8ZSvHPWLuhaEBDg8fWgOcwK@dpg-d3v69uuuk2gs73ebikgg-a:5432/titan_db
   ```
   **Important**: Make sure it ends with `/titan_db` (or just the database name), NOT a connection string

4. **Go to your `tit` service** → Environment tab
5. **Find `DATABASE_URL`** and click to edit
6. **Paste the correct connection string**
7. **VERIFY** it ends with `/titan_db` (or your actual database name)
8. **Save**

## What to Check

- ✅ URL starts with `postgresql://`
- ✅ URL has format: `postgresql://user:password@host:port/database_name`
- ✅ The part after the last `/` is just the database name (e.g., `titan_db`)
- ❌ The part after the last `/` should NOT contain `://`, `@`, or `postgresql`

## After Fixing

Render will automatically redeploy. You should see:
- `✅ [PRISMA] DATABASE_URL format is valid (database: titan_db)`
- Service starts successfully

## Still Not Working?

If you're not sure what the correct database name is:
1. Go to your PostgreSQL database service in Render
2. Check the database name in the service details
3. It's usually something like `titan_db` or `titan_db_bi9n`
4. Use that exact name in the connection string

