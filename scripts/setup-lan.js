const { execSync } = require('child_process');

console.log('\n========================================');
console.log('   IMPOSTER LAN & EMULATOR NETWORK SETUP');
console.log('========================================\n');

try {
  const devicesRaw = execSync('adb devices', { encoding: 'utf8' });
  const lines = devicesRaw.split('\n').filter(l => l.trim() && !l.startsWith('List of devices'));
  
  const devices = lines.map(line => {
    const [id, status] = line.trim().split(/\s+/);
    const isEmulator = id.startsWith('emulator-');
    return { id, status, isEmulator };
  }).filter(d => d.status === 'device');

  if (devices.length === 0) {
    console.log('No ADB devices detected.');
    process.exit(0);
  }

  console.log(`Found ${devices.length} connected device(s):\n`);

  for (const d of devices) {
    if (d.isEmulator) {
      console.log(`[Emulator] ${d.id}`);
      try {
        execSync(`adb -s ${d.id} forward tcp:47777 tcp:47777`);
        console.log(`  ✓ Port 47777 forwarded for ${d.id} (connects via 10.0.2.2)`);
      } catch (e) {
        console.log(`  ! Port forward error on ${d.id}:`, e.message);
      }
    } else {
      let ip = 'Unknown';
      try {
        const ipOut = execSync(`adb -s ${d.id} shell ip -4 addr show wlan0`, { encoding: 'utf8' });
        const match = ipOut.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match) ip = match[1];
      } catch {}
      console.log(`[Physical Device] ${d.id} - Wi-Fi IP: ${ip}`);
    }
  }

  console.log('\n----------------------------------------');
  console.log('HOW TO CONNECT:');
  console.log('1. If Physical Phone hosts:');
  console.log('   - Other devices enter the Phone Wi-Fi IP shown on screen.');
  console.log('2. If Android Emulator hosts:');
  console.log('   - Other emulators enter 10.0.2.2 to join.');
  console.log('   - Physical phone enters your PC IP on Wi-Fi to join.');
  console.log('----------------------------------------\n');
} catch (err) {
  console.error('Error configuring LAN:', err.message);
}
