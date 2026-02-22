const fs = require('fs');
const path = require('path');

// Read your service account file
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase-service-account.json'), 'utf8'));

console.log('\n🔑 COPY THESE EXACT VALUES TO VERCEL ENVIRONMENT VARIABLES:\n');
console.log('='.repeat(80));
console.log('\n1️⃣  FIREBASE_PROJECT_ID');
console.log('Value:');
console.log(serviceAccount.project_id);
console.log('\n' + '-'.repeat(80));

console.log('\n2️⃣  FIREBASE_CLIENT_EMAIL');
console.log('Value:');
console.log(serviceAccount.client_email);
console.log('\n' + '-'.repeat(80));

console.log('\n3️⃣  FIREBASE_PRIVATE_KEY (COPY EVERYTHING INCLUDING THE BEGIN/END LINES)');
console.log('Value:');
console.log(serviceAccount.private_key);
console.log('\n' + '-'.repeat(80));

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('2. Add these three variables with EXACTLY the values above');
console.log('3. For FIREBASE_PRIVATE_KEY, paste the entire block including BEGIN/END lines');
console.log('4. Click Save');
console.log('5. Redeploy your app\n');