# Render DATABASE_URL Fix Guide

## Problem Identified

The logs show that the `DATABASE_URL` environment variable in Render is **malformed**. The database name portion contains a full connection string instead of just the database name.

### Current (Malformed) Format:
```
postgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db_bi9npostgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db_bi9n
```

### Expected (Correct) Format:
```
postgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db
```

## How to Fix

1. **Go to Render Dashboard**:
   - Navigate to your `tit` service
   - Click on "Environment" tab

2. **Find DATABASE_URL**:
   - Look for the `DATABASE_URL` environment variable
   - Click to edit it

3. **Get the Correct Connection String**:
   - Go to your PostgreSQL database service in Render
   - Find the "Internal Database URL" or "Connection String"
   - It should look like: `postgresql://titan_db_bi9n_user:password@dpg-d3v69uuuk2gs73ebikgg-a/titan_db`
   - **Important**: The part after the last `/` should be just the database name (e.g., `titan_db`), NOT a connection string

4. **Update DATABASE_URL**:
   - Copy the correct connection string
   - Paste it into the `DATABASE_URL` field in your `tit` service
   - Make sure it ends with just the database name, like `/titan_db`
   - Save the changes

5. **Verify the Format**:
   - The URL should be: `postgresql://user:password@host:port/database_name`
   - The `database_name` should be a simple name (e.g., `titan_db`)
   - It should NOT contain `://`, `@`, or `postgresql` in the database name

## What the Logs Show

The error logs show:
```
pathname: '/titan_db_bi9npostgresql://titan_db_bi9n_user:...@dpg-d3v69uuuk2gs73ebikgg-a/titan_db_bi9n'
database: 'titan_db_bi9npostgresql://titan_db_bi9n_user:...@dpg-d3v69uuuk2gs73ebikgg-a/titan_db_bi9n'
```

This means the database name is 118 characters long and contains a full connection string. The correct database name should be just `titan_db` (8 characters).

## After Fixing

Once you update the `DATABASE_URL` in Render:
1. Render will automatically redeploy
2. You should see: `✅ [PRISMA] DATABASE_URL format is valid (database: titan_db)`
3. The service should start successfully

## Common Mistakes

- ❌ Setting database name to: `titan_db_bi9npostgresql://...` (contains connection string)
- ❌ Setting database name to: `postgresql://...` (entire connection string)
- ✅ Setting database name to: `titan_db` (just the database name)

