#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the logs directory
const logsDir = path.join(process.cwd(), 'logs', 'payments');

// Function to read and display logs
function viewLogs() {
  try {
    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
      console.log('No payment logs directory found. Logs will be created when payments are processed.');
      return;
    }

    // Get all log files
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse(); // Most recent first

    if (logFiles.length === 0) {
      console.log('No payment log files found.');
      return;
    }

    console.log('📊 Payment Logs Viewer');
    console.log('====================\n');

    // Display each log file
    logFiles.forEach((file, index) => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      console.log(`📁 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      console.log(`   Created: ${stats.birthtime.toLocaleString()}`);
      console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
      
      // Read and display last 10 entries
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      console.log(`   Entries: ${lines.length}`);
      
      if (lines.length > 0) {
        console.log('   Recent entries:');
        lines.slice(-10).forEach((line, lineIndex) => {
          try {
            const entry = JSON.parse(line);
            const timestamp = new Date(entry.timestamp).toLocaleString();
            const event = entry.event.toUpperCase();
            const transactionId = entry.transactionId || 'N/A';
            const amount = entry.amount ? `$${entry.amount}` : 'N/A';
            const status = entry.status || entry.error || 'N/A';
            
            console.log(`     ${lines.length - 10 + lineIndex + 1}. [${timestamp}] ${event} - ${transactionId} - ${amount} - ${status}`);
          } catch (parseError) {
            console.log(`     ${lines.length - 10 + lineIndex + 1}. ${line.substring(0, 100)}...`);
          }
        });
      }
      
      console.log('');
    });

    // Show summary
    console.log('📈 Summary:');
    const allLogs = [];
    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          allLogs.push(entry);
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      });
    });

    const eventCounts = allLogs.reduce((acc, entry) => {
      acc[entry.event] = (acc[entry.event] || 0) + 1;
      return acc;
    }, {});

    Object.entries(eventCounts).forEach(([event, count]) => {
      console.log(`   ${event.toUpperCase()}: ${count}`);
    });

    console.log(`   Total entries: ${allLogs.length}`);

  } catch (error) {
    console.error('Error reading payment logs:', error);
  }
}

// Run the viewer
viewLogs();
