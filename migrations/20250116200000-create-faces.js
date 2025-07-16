'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('faces', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier for face record'
      },
      
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'User who owns the content containing this face'
      },
      
      content_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'content',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Content where this face was detected'
      },
      
      file_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'File where this face was detected'
      },
      
      image_analysis_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'image_analysis',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Image analysis record containing this face'
      },
      
      video_analysis_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'video_analysis',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Video analysis record containing this face (for video frames)'
      },
      
      face_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Identified name of the person (AI-suggested or user-confirmed)'
      },
      
      ai_suggested_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Name suggested by AI analysis before user confirmation'
      },
      
      name_confidence: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
        comment: 'Confidence score for face name identification (0.0-1.0)'
      },
      
      name_source: {
        type: Sequelize.ENUM('ai_suggestion', 'user_input', 'face_recognition', 'metadata_extraction'),
        allowNull: true,
        defaultValue: 'ai_suggestion',
        comment: 'Source of face name identification'
      },
      
      user_confirmed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the face name has been confirmed by the user'
      },
      
      face_encoding: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Face encoding/embedding vector for recognition (128-dimensional array)'
      },
      
      detection_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Face detection metadata including bounding box, landmarks, emotions, age, gender'
      },
      
      face_group_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        comment: 'ID for grouping similar faces of the same person'
      },
      
      recognition_score: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
        comment: 'Face recognition matching score when compared to known faces'
      },
      
      is_primary_face: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is the primary/best quality instance of this person'
      },
      
      privacy_settings: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Privacy settings for face display and sharing'
      },
      
      learning_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Learning data for improving face recognition accuracy'
      },
      
      processing_status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'skipped'),
        defaultValue: 'pending',
        comment: 'Status of face recognition processing'
      },
      
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if face processing failed'
      },
      
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Record creation timestamp'
      },
      
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Record last update timestamp'
      }
    });

    // Create indexes
    await queryInterface.addIndex('faces', ['user_id'], {
      name: 'idx_faces_user_id'
    });
    
    await queryInterface.addIndex('faces', ['content_id'], {
      name: 'idx_faces_content_id'
    });
    
    await queryInterface.addIndex('faces', ['file_id'], {
      name: 'idx_faces_file_id'
    });
    
    await queryInterface.addIndex('faces', ['face_name'], {
      name: 'idx_faces_name'
    });
    
    await queryInterface.addIndex('faces', ['face_group_id'], {
      name: 'idx_faces_group_id'
    });
    
    await queryInterface.addIndex('faces', ['user_confirmed'], {
      name: 'idx_faces_user_confirmed'
    });
    
    await queryInterface.addIndex('faces', ['name_confidence'], {
      name: 'idx_faces_name_confidence'
    });
    
    await queryInterface.addIndex('faces', ['processing_status'], {
      name: 'idx_faces_processing_status'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('faces', 'idx_faces_processing_status');
    await queryInterface.removeIndex('faces', 'idx_faces_name_confidence');
    await queryInterface.removeIndex('faces', 'idx_faces_user_confirmed');
    await queryInterface.removeIndex('faces', 'idx_faces_group_id');
    await queryInterface.removeIndex('faces', 'idx_faces_name');
    await queryInterface.removeIndex('faces', 'idx_faces_file_id');
    await queryInterface.removeIndex('faces', 'idx_faces_content_id');
    await queryInterface.removeIndex('faces', 'idx_faces_user_id');
    
    // Drop table
    await queryInterface.dropTable('faces');
  }
}; 