const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all tasks for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const [tasks] = await db.execute(
      'SELECT id, title, completed, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.user.id]
    );

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new task
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1 }).withMessage('Task title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title } = req.body;
    const userId = req.user.user.id;

    const [result] = await db.execute(
      'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
      [userId, title]
    );

    const [newTask] = await db.execute(
      'SELECT id, title, completed, created_at, updated_at FROM tasks WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task (toggle completed status or update title)
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Task title cannot be empty'),
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskId = req.params.id;
    const userId = req.user.user.id;
    const { title, completed } = req.body;

    // Check if task belongs to user
    const [existingTask] = await db.execute(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existingTask.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Build update query dynamically
    let updateQuery = 'UPDATE tasks SET ';
    let updateValues = [];
    let updateFields = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }

    if (completed !== undefined) {
      updateFields.push('completed = ?');
      updateValues.push(completed);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateQuery += updateFields.join(', ') + ', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?';
    updateValues.push(taskId, userId);

    await db.execute(updateQuery, updateValues);

    // Get updated task
    const [updatedTask] = await db.execute(
      'SELECT id, title, completed, created_at, updated_at FROM tasks WHERE id = ?',
      [taskId]
    );

    res.json({
      message: 'Task updated successfully',
      task: updatedTask[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.user.id;

    // Check if task belongs to user
    const [existingTask] = await db.execute(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existingTask.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await db.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);

    res.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
