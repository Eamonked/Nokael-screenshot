const { SQLiteService } = require('./src/main/sqliteService');
const path = require('path');

async function testSQLite() {
  console.log('Testing SQLite service...');
  
  try {
    // Create SQLite service
    const testPath = path.join(__dirname, 'test-data');
    const sqliteService = new SQLiteService(testPath);
    
    // Test adding an incident
    const incidentData = {
      imageFileName: 'test-screenshot.png',
      imagePath: '/path/to/test-screenshot.png',
      remarks: 'Test incident',
      incident: 'Test incident description',
      area: 'Test Area',
      operator: 'Test Operator',
      timestamp: new Date().toISOString()
    };
    
    const incidentId = await sqliteService.addIncident(incidentData);
    console.log('✅ Added incident with ID:', incidentId);
    
    // Test getting incidents
    const incidents = await sqliteService.getIncidents();
    console.log('✅ Retrieved incidents:', incidents.length);
    
    // Test search
    const searchResults = await sqliteService.getIncidents({ search: 'Test' });
    console.log('✅ Search results:', searchResults.length);
    
    // Test sync stats
    const stats = await sqliteService.getSyncStats();
    console.log('✅ Sync stats:', stats);
    
    // Clean up
    sqliteService.close();
    console.log('✅ SQLite test completed successfully!');
    
  } catch (error) {
    console.error('❌ SQLite test failed:', error);
  }
}

testSQLite(); 