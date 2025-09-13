#!/usr/bin/env node
// Script to generate manifest.json from single source of truth

const fs = require('fs');
const path = require('path');

// Import the website configuration
const { getHostPermissions, getContentScriptMatches } = require('./config/websites.js');

// Read the current manifest
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Update host permissions
manifest.host_permissions = getHostPermissions();

// Update content script matches
manifest.content_scripts[0].matches = getContentScriptMatches();

// Write the updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('✅ Manifest updated with latest website configuration');
console.log('📋 Host permissions:', manifest.host_permissions.length);
console.log('📋 Content script matches:', manifest.content_scripts[0].matches.length);
