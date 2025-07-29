const { sequelize } = require('./models');

async function checkColumns() {
  try {
    const tables = ['video_analysis', 'audio_analysis', 'image_analysis'];
    
    for (const table of tables) {
      const columns = await sequelize.query(`DESCRIBE ${table}`, { 
        type: sequelize.QueryTypes.SELECT 
      });
      
      console.log(`\n${table} columns:`);
      const hasProcessingJobId = columns.some(col => col.Field === 'processing_job_id');
      console.log(`- Has processing_job_id: ${hasProcessingJobId}`);
      
      if (!hasProcessingJobId) {
        console.log(`  ❌ Missing processing_job_id column!`);
      } else {
        console.log(`  ✅ processing_job_id column exists`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkColumns(); 