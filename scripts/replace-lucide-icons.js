#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Icon mapping from lucide-react to react-icons/lu
const iconMappings = {
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
  'AlertTriangle': 'LuAlertTriangle',
  'CheckCircle': 'LuCheckCircle',
  'Clock': 'LuClock',
  'XCircle': 'LuXCircle',
  'Video': 'LuVideo',
  'Download': 'LuDownload',
  'Target': 'LuTarget',
  'Edit': 'LuEdit',
  'Trash2': 'LuTrash2',
  'Eye': 'LuEye',
  'Upload': 'LuUpload',
  'FileText': 'LuFileText',
  'Users': 'LuUsers',
  'Mail': 'LuMail',
  'UserCheck': 'LuUserCheck',
  'Loader2': 'LuLoader2',
  'Phone': 'LuPhone',
  'TrendingDown': 'LuTrendingDown',
  'UserPlus': 'LuUserPlus',
  'Activity': 'LuActivity',
  'Zap': 'LuZap',
  'Award': 'LuAward',
  'ChevronDown': 'LuChevronDown',
  'AlertCircle': 'LuAlertCircle',
  'CheckCircle2': 'LuCheckCircle2',
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
  'Info': 'LuInfo',
  'Circle': 'LuCircle',
  'UserX': 'LuUserX',
  'MessageSquare': 'LuMessageSquare',
  'Layers': 'LuLayers',
  'Image': 'LuImage',
  'Palette': 'LuPalette',
  'Type': 'LuType',
  'Timer': 'LuTimer',
  'PlayCircle': 'LuPlayCircle',
  'CheckCircle2': 'LuCheckCircle2',
  'XCircle': 'LuXCircle',
  'AlertCircle': 'LuAlertCircle',
  'CheckCircle': 'LuCheckCircle',
  'Lightbulb': 'LuLightbulb',
  'Medal': 'LuMedal',
  'Timer': 'LuTimer'
};

function replaceIconsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if file imports from lucide-react
    if (content.includes('from "lucide-react"') || content.includes("from 'lucide-react'")) {
      console.log(`Processing: ${filePath}`);
      
      // Replace the import statement
      const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"]/g;
      const importMatch = importRegex.exec(content);
      
      if (importMatch) {
        const iconList = importMatch[1].split(',').map(icon => icon.trim());
        const newIconList = iconList.map(icon => {
          const mappedIcon = iconMappings[icon];
          return mappedIcon ? `${mappedIcon} as ${icon}` : icon;
        });
        
        const newImport = `import { ${newIconList.join(', ')} } from 'react-icons/lu';`;
        content = content.replace(importMatch[0], newImport);
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${filePath}`);
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
      replaceIconsInFile(filePath);
    }
  }
}

// Process the src directory
console.log('Starting icon replacement...');
processDirectory('./src');
console.log('Icon replacement completed!');
