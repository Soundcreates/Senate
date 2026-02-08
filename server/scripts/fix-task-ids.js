require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');

async function fixTaskIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const projects = await Project.find();
    console.log(`Found ${projects.length} projects`);

    for (const project of projects) {
      console.log(`\nProcessing project: ${project.name} (${project._id})`);
      
      // Get all tasks for this project
      const tasks = await Task.find({ projectId: project._id });
      console.log(`  Found ${tasks.length} Task documents`);
      console.log(`  Found ${project.tasks.length} tasks in project.tasks array`);

      // Create a map of task titles to Task document IDs
      const taskIdMap = {};
      tasks.forEach(task => {
        taskIdMap[task.title] = task._id;
      });

      // Update project.tasks array to match Task document IDs
      let updated = false;
      for (let i = 0; i < project.tasks.length; i++) {
        const projectTask = project.tasks[i];
        const correctId = taskIdMap[projectTask.title];
        
        if (correctId && projectTask._id.toString() !== correctId.toString()) {
          console.log(`  Updating task "${projectTask.title}":`);
          console.log(`    Old ID: ${projectTask._id}`);
          console.log(`    New ID: ${correctId}`);
          project.tasks[i]._id = correctId;
          updated = true;
        }
      }

      if (updated) {
        await project.save();
        console.log(`  ✅ Updated project.tasks IDs`);
      } else {
        console.log(`  ℹ️  No ID mismatches found`);
      }
    }

    console.log('\n✅ Task ID synchronization complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTaskIds();
