@echo off
title WebP Converter

echo 🎨 Starting WebP Converter...
echo 📁 Working directory: %CD%

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm (usually comes with Node.js)
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo ✅ Node.js is installed
echo ✅ npm is installed

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the application
echo 🚀 Launching WebP Converter...
npm start

pause
