#!/bin/bash

# WebP Converter Launcher for macOS/Linux

echo "🎨 Starting WebP Converter..."
echo "📁 Working directory: $(pwd)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm (usually comes with Node.js)"
    echo "Press any key to exit..."
    read -n 1
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the application
echo "🚀 Launching WebP Converter..."
npm start
