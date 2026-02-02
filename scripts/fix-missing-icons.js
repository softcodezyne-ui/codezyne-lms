#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix icon mappings to use correct names that actually exist in react-icons/lu
const iconFixes = [
  // Fix Home -> House
  { from: 'LuHome', to: 'LuHouse' },
  // Fix other common issues
  { from: 'LuCheckCircle2', to: 'LuCheckCircle' },
  { from: 'LuAlertTriangle', to: 'LuAlertTriangle' },
  { from: 'LuBarChart3', to: 'LuBarChart' },
  { from: 'LuMoreHorizontal', to: 'LuMoreHorizontal' },
  { from: 'LuChevronsLeft', to: 'LuChevronsLeft' },
  { from: 'LuChevronsRight', to: 'LuChevronsRight' },
  { from: 'LuLayoutDashboard', to: 'LuLayoutDashboard' },
  { from: 'LuLogOut', to: 'LuLogOut' },
  { from: 'LuKey', to: 'LuKey' },
  { from: 'LuCreditCard', to: 'LuCreditCard' },
  { from: 'LuRotateCcw', to: 'LuRotateCcw' },
  { from: 'LuInfo', to: 'LuInfo' },
  { from: 'LuFileCheck', to: 'LuFileCheck' },
  { from: 'LuDatabase', to: 'LuDatabase' },
  { from: 'LuFile', to: 'LuFile' },
  { from: 'LuFlag', to: 'LuFlag' },
  // Fix double Lu prefixes
  { from: 'LuLuInfo', to: 'LuInfo' },
  { from: 'LuLuMoreHorizontal', to: 'LuMoreHorizontal' },
  { from: 'LuLuBarChart3', to: 'LuBarChart' },
  { from: 'LuCheckCircle22', to: 'LuCheckCircle' },
  { from: 'LuLuFileText', to: 'LuFileText' },
  { from: 'LuLuLayoutDashboard', to: 'LuLayoutDashboard' },
  { from: 'LuLuLogOut', to: 'LuLogOut' },
  { from: 'LuLuCreditCard', to: 'LuCreditCard' },
  { from: 'LuLuChevronsLeft', to: 'LuChevronsLeft' },
  { from: 'LuLuChevronsRight', to: 'LuChevronsRight' }
];

function fixIconsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file imports from react-icons/lu
    if (content.includes('from "react-icons/lu"') || content.includes("from 'react-icons/lu'")) {
      console.log(`Processing: ${filePath}`);
      
      iconFixes.forEach(fix => {
        if (content.includes(fix.from)) {
          content = content.replace(new RegExp(fix.from, 'g'), fix.to);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Fixed: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixIconsInFile(filePath);
    }
  }
}

// Process the src directory
console.log('Starting icon fixes for missing icons...');
processDirectory('./src');
console.log('Icon fixes completed!');
