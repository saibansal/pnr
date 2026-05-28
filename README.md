# RailStatus • Premium PNR Tracker Dashboard

A high-fidelity, glassmorphism-themed React dashboard designed to track Indian Railway PNR statuses. Integrated with a **real IRCTC RapidAPI endpoint** and **Supabase Database** for persistence.

---

## Features
- **Modern Dark UI**: Aesthetic glassmorphism layout, responsive grid cards, and intuitive custom HSL theme variables.
- **Supabase Persistence**: Save PNR details permanently across page reloads.
- **Manual Refresh**: Query updates dynamically from the RapidAPI host.
- **Offline DB Fallback**: The app continues to work immediately using `localStorage` if Supabase environment variables are missing!
- **Developer Mock Simulator**: Toggle to generate mock PNR data that mimics waitlist transitions and confirms berths on refresh.

---

## Step-by-Step Setup Guide

Follow these steps to get the application up and running on your machine:

### Step 1: Create Supabase Database
1. Head over to [Supabase](https://supabase.com) and sign in.
2. Create a new project (e.g., `RailStatus`).
3. Once the database is ready, navigate to the **SQL Editor** tab from the left sidebar.
4. Open the [supabase_schema.sql](file:///D:/pnr/supabase_schema.sql) file located in your project root, copy its contents, paste it into the editor, and click **Run**. This will create the `pnr_records` table, indices, and appropriate RLS policies.

### Step 2: Configure Environment Variables
1. Open the [.env](file:///D:/pnr/.env) file located in your project root.
2. In Supabase, go to **Settings (Gear Icon)** -> **API**.
3. Copy your **Project URL** and paste it as `VITE_SUPABASE_URL`.
4. Copy your **anon public** key and paste it as `VITE_SUPABASE_ANON_KEY`.
5. *(Note: The `.env` file is already preset with the RapidAPI key and host provided in your prompt, so no changes are needed there!)*

### Step 3: Install Dependencies
1. Open your terminal of choice (Command Prompt, Git Bash, or VS Code terminal) in the directory `D:\pnr`.
2. Run the following command to download all package dependencies:
   ```bash
   npm install
   ```

### Step 4: Run the Development Server
1. Launch the Vite local dev server by running:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Developer Guide

### Mock Mode
In the top-right header, you will find a toggle switch labeled **"Real API Active"** / **"Mock Simulator"**. 
- When **Mock Simulator** is ON, the app will simulate realistic network delays and returns reproducible fake train metadata. This is highly useful for checking passenger lists, waitlist colors, and testing "Manual Refresh" transitions without exhausting your monthly RapidAPI subscription credits.

### Settings Drawer
Click the gear icon `⚙️` in the top right to access dynamic configuration settings. You can paste custom API keys or Supabase URLs here on the fly. These credentials are saved to browser `localStorage` and will override the `.env` settings temporarily. Use "Clear Overrides" to go back to `.env` values.
