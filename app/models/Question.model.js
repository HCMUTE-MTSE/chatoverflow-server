const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    tags: [{ type: String, trim: true }],
    askedTime: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isHidden: { type: Boolean, default: false },
    hideReason: { type: String, default: null },
    hiddenAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

QuestionSchema.virtual('answerCount', {
  ref: 'Answer',
  localField: '_id',
  foreignField: 'question',
  count: true,
});

/* 
Add text index for search functionality
*/
QuestionSchema.index(
  {
    title: 'text',
    content: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      content: 5,
      tags: 3,
    },
  }
);

// Helper function to update tags
const updateTags = async (tags) => {
  const Tag = require('./Tag.model');

  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      if (tagName && tagName.trim()) {
        await Tag.incrementCount(tagName.trim());
      }
    }
  }
};

// Middleware to sync tags when question is saved (single document)
QuestionSchema.post('save', async function () {
  await updateTags(this.tags);
});

// Static method to create questions with auto tag update
QuestionSchema.statics.createWithTags = async function (questionData) {
  const question = new this(questionData);
  await question.save(); // This will trigger post('save') middleware
  return question;
};

// Static method to create many questions with auto tag update
QuestionSchema.statics.createManyWithTags = async function (questionsData) {
  const questions = [];
  for (const questionData of questionsData) {
    const question = await this.createWithTags(questionData);
    questions.push(question);
  }
  return questions;
};

// Alternative: Fast bulk insert with manual tag sync
QuestionSchema.statics.insertManyWithTags = async function (questionsData) {
  const Tag = require('./Tag.model');

  // Insert questions quickly
  const questions = await this.insertMany(questionsData);

  // Manually update tags
  const tagCounts = {};
  for (const question of questions) {
    if (question.tags && question.tags.length > 0) {
      for (const tagName of question.tags) {
        if (tagName && tagName.trim()) {
          const cleanTag = tagName.trim();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        }
      }
    }
  }

  // Batch update tag counts
  for (const [tagName, count] of Object.entries(tagCounts)) {
    await Tag.findOneAndUpdate(
      { name: tagName.toLowerCase() },
      {
        $inc: { questionCount: count },
        $setOnInsert: {
          name: tagName.toLowerCase(),
          displayName: tagName,
        },
      },
      { upsert: true, new: true }
    );
  }

  return questions;
};

// Middleware to handle tag updates
QuestionSchema.pre('findOneAndUpdate', async function () {
  const Tag = require('./Tag.model');
  const docToUpdate = await this.model.findOne(this.getQuery());

  if (docToUpdate && docToUpdate.tags) {
    // Store old tags for comparison
    this._oldTags = docToUpdate.tags;
  }
});

QuestionSchema.post('findOneAndUpdate', async function (doc) {
  const Tag = require('./Tag.model');

  if (doc && this._oldTags) {
    // Decrement old tags
    for (const tagName of this._oldTags) {
      if (tagName && tagName.trim()) {
        await Tag.decrementCount(tagName.trim());
      }
    }

    // Increment new tags
    await updateTags(doc.tags);
  }
});

// Helper function to decrement tags
const decrementTags = async (tags) => {
  const Tag = require('./Tag.model');

  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      if (tagName && tagName.trim()) {
        await Tag.decrementCount(tagName.trim());
      }
    }
  }
};

// Unified middleware to handle question deletion (both document and query level)
QuestionSchema.pre('deleteOne', async function () {
  let tagsToDecrement = null;

  // Check if this is a document middleware (has direct access to tags)
  if (this.tags) {
    // Document level: instance.deleteOne()
    tagsToDecrement = this.tags;
  } else {
    // Query level: Model.deleteOne() - need to find the document first
    const docToDelete = await this.model.findOne(this.getQuery());
    if (docToDelete && docToDelete.tags) {
      tagsToDecrement = docToDelete.tags;
    }
  }

  if (tagsToDecrement) {
    await decrementTags(tagsToDecrement);
  }
});

// Middleware to handle deleteMany - track documents before deletion
QuestionSchema.pre('deleteMany', async function () {
  const Tag = require('./Tag.model');

  // Get documents that will be deleted to track their tags
  const documentsToDelete = await this.model.find(this.getQuery());

  if (documentsToDelete.length > 0) {
    // Count tags that will be decremented
    const tagCounts = {};
    for (const doc of documentsToDelete) {
      if (doc.tags && doc.tags.length > 0) {
        for (const tagName of doc.tags) {
          if (tagName && tagName.trim()) {
            const cleanTag = tagName.trim();
            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
          }
        }
      }
    }

    // Store tag counts for post middleware
    this._deletedTagCounts = tagCounts;
  }
});

QuestionSchema.post('deleteMany', async function (result) {
  const Tag = require('./Tag.model');

  // Decrement tag counts based on deleted documents
  if (
    this._deletedTagCounts &&
    Object.keys(this._deletedTagCounts).length > 0
  ) {
    for (const [tagName, count] of Object.entries(this._deletedTagCounts)) {
      await Tag.findOneAndUpdate(
        { name: tagName.toLowerCase() },
        { $inc: { questionCount: -count } },
        { new: true }
      );
    }
    console.log(
      `✅ Decremented tags for ${result.deletedCount} deleted questions`
    );
  } else {
    console.log('Warning: deleteMany used but no tag cleanup needed');
  }
});

module.exports = mongoose.model('Question', QuestionSchema);
