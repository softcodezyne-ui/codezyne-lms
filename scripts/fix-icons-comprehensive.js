#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Comprehensive icon mapping using multiple react-icons sets
const iconMappings = {
  // Basic icons from react-icons/lu
  'X': 'LuX',
  'Menu': 'LuMenu',
  'ChevronDown': 'LuChevronDown',
  'ShoppingBag': 'LuShoppingBag',
  'Facebook': 'LuFacebook',
  'Youtube': 'LuYoutube',
  'Instagram': 'LuInstagram',
  'Linkedin': 'LuLinkedin',
  'Play': 'LuPlay',
  'GraduationCap': 'LuGraduationCap',
  'Search': 'LuSearch',
  'Bookmark': 'LuBookmark',
  'Home': 'LuHome',
  'ArrowLeft': 'LuArrowLeft',
  'Plus': 'LuPlus',
  'User': 'LuUser',
  'BookOpen': 'LuBookOpen',
  'Calendar': 'LuCalendar',
  'DollarSign': 'LuDollarSign',
  'TrendingUp': 'LuTrendingUp',
  'RefreshCw': 'LuRefreshCw',
  'Filter': 'LuFilter',
  'Tag': 'LuTag',
  'ArrowUpDown': 'LuArrowUpDown',
  'Settings': 'LuSettings',
  'Target': 'LuTarget',
  'Trash2': 'LuTrash2',
  'Eye': 'LuEye',
  'Upload': 'LuUpload',
  'FileText': 'LuFileText',
  'Users': 'LuUsers',
  'Mail': 'LuMail',
  'UserCheck': 'LuUserCheck',
  'Phone': 'LuPhone',
  'TrendingDown': 'LuTrendingDown',
  'UserPlus': 'LuUserPlus',
  'Activity': 'LuActivity',
  'Zap': 'LuZap',
  'Award': 'LuAward',
  'HelpCircle': 'LuHelpCircle',
  'FolderOpen': 'LuFolderOpen',
  'Presentation': 'LuPresentation',
  'Send': 'LuSend',
  'Link': 'LuLink',
  'LinkIcon': 'LuLink',
  'Check': 'LuCheck',
  'ChevronUp': 'LuChevronUp',
  'PanelLeft': 'LuPanelLeft',
  'Save': 'LuSave',
  'ArrowRight': 'LuArrowRight',
  'Share2': 'LuShare2',
  'Copy': 'LuCopy',
  'Folder': 'LuFolder',
  'Clipboard': 'LuClipboard',
  'Monitor': 'LuMonitor',
  'MessageCircle': 'LuMessageCircle',
  'ChevronLeft': 'LuChevronLeft',
  'ChevronRight': 'LuChevronRight',
  'EyeOff': 'LuEyeOff',
  'Lock': 'LuLock',
  'Shield': 'LuShield',
  'Trophy': 'LuTrophy',
  'Star': 'LuStar',
  'History': 'LuHistory',
  'ListChecks': 'LuListChecks',
  'GripVertical': 'LuGripVertical',
  'Circle': 'LuCircle',
  'UserX': 'LuUserX',
  'MessageSquare': 'LuMessageSquare',
  'Layers': 'LuLayers',
  'Image': 'LuImage',
  'Palette': 'LuPalette',
  'Type': 'LuType',
  'Timer': 'LuTimer',
  'PlayCircle': 'LuPlayCircle',
  'Lightbulb': 'LuLightbulb',
  'Medal': 'LuMedal',
  'Loader2': 'LuLoader',
  
  // Icons that need different mappings
  'Edit': 'LuPencil', // Use Pencil instead of Edit
  'AlertCircle': 'LuAlertTriangle', // Use triangle instead of circle
  'CheckCircle': 'LuCheckCircle2', // Use CheckCircle2
  'XCircle': 'LuX', // Use X instead of XCircle
  'AlertTriangle': 'LuAlertTriangle',
  'CheckCircle2': 'LuCheckCircle2',
  
  // Icons that don't exist in Lu set - use alternative icons or different sets
  'LayoutDashboard': 'LuLayoutDashboard',
  'BookMarked': 'LuBookmark',
  'LogOut': 'LuLogOut',
  'BarChart3': 'LuBarChart3',
  'MoreHorizontal': 'LuMoreHorizontal',
  'ChevronsLeft': 'LuChevronsLeft',
  'ChevronsRight': 'LuChevronsRight',
  'Key': 'LuKey',
  'CreditCard': 'LuCreditCard',
  'RotateCcw': 'LuRotateCcw',
  'Info': 'LuInfo',
  'FileCheck': 'LuFileCheck',
  'Database': 'LuDatabase',
  'File': 'LuFile',
  'Flag': 'LuFlag'
};

function fixIconsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file imports from react-icons/lu
    if (content.includes('from "react-icons/lu"') || content.includes("from 'react-icons/lu'")) {
      console.log(`Processing: ${filePath}`);
      
      // Fix specific problematic imports
      const fixes = [
        // Fix Edit -> Pencil
        { from: 'LuEdit', to: 'LuPencil' },
        // Fix Loader2 -> Loader
        { from: 'LuLoader2', to: 'LuLoader' },
        // Fix AlertCircle -> AlertTriangle
        { from: 'LuAlertCircle', to: 'LuAlertTriangle' },
        // Fix CheckCircle -> CheckCircle2
        { from: 'LuCheckCircle', to: 'LuCheckCircle2' },
        // Fix XCircle -> X
        { from: 'LuXCircle', to: 'LuX' },
        // Fix missing icons
        { from: 'LayoutDashboard', to: 'LuLayoutDashboard' },
        { from: 'BookMarked', to: 'LuBookmark' },
        { from: 'LogOut', to: 'LuLogOut' },
        { from: 'BarChart3', to: 'LuBarChart3' },
        { from: 'MoreHorizontal', to: 'LuMoreHorizontal' },
        { from: 'ChevronsLeft', to: 'LuChevronsLeft' },
        { from: 'ChevronsRight', to: 'LuChevronsRight' },
        { from: 'Key', to: 'LuKey' },
        { from: 'CreditCard', to: 'LuCreditCard' },
        { from: 'RotateCcw', to: 'LuRotateCcw' },
        { from: 'Info', to: 'LuInfo' },
        { from: 'FileCheck', to: 'LuFileCheck' },
        { from: 'Database', to: 'LuDatabase' },
        { from: 'File', to: 'LuFile' },
        { from: 'Flag', to: 'LuFlag' },
        // Fix double Lu prefixes
        { from: 'LuLuInfo', to: 'LuInfo' },
        { from: 'LuLuMoreHorizontal', to: 'LuMoreHorizontal' },
        { from: 'LuLuBarChart3', to: 'LuBarChart3' },
        { from: 'LuCheckCircle22', to: 'LuCheckCircle2' }
      ];
      
      fixes.forEach(fix => {
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
console.log('Starting comprehensive icon fixes...');
processDirectory('./src');
console.log('Comprehensive icon fixes completed!');
