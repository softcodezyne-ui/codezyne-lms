import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Utility function to upload avatar
export const uploadAvatar = async (file: Buffer, userId: string): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'lms/avatars',
        public_id: `avatar_${userId}_${Date.now()}`,
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    ).end(file);
  });
};

// Utility function to delete avatar
export const deleteAvatar = async (publicId: string): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return false;
  }
};

// PDF Upload Options Interface
export interface PDFUploadOptions {
  folder?: string;
  description?: string;
  originalName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

// PDF Upload Result Interface
export interface PDFUploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  secureUrl?: string;
  error?: string;
}

// PDF Delete Result Interface
export interface PDFDeleteResult {
  success: boolean;
  error?: string;
}

// PDF Info Result Interface
export interface PDFInfoResult {
  success: boolean;
  pdf?: {
    publicId: string;
    url: string;
    secureUrl: string;
    fileName: string;
    size: number;
    format: string;
    uploadedAt: string;
    uploadedBy: string;
    folder: string;
    description: string;
  };
  error?: string;
}

// Utility function to upload PDF
export const uploadPDF = async (file: Buffer, options: PDFUploadOptions = {}): Promise<PDFUploadResult> => {
  return new Promise((resolve) => {
    const {
      folder = 'lms/documents',
      description = '',
      originalName = 'document',
      uploadedBy = 'unknown',
      uploadedAt = new Date().toISOString()
    } = options;

    // Generate unique public ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const publicId = `${folder}/${originalName.replace(/\.[^/.]+$/, '')}_${timestamp}_${randomId}`;

    cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: 'raw',
        format: 'pdf',
        tags: ['lms', 'document', 'pdf'],
        context: {
          description: description,
          original_name: originalName,
          uploaded_by: uploadedBy,
          uploaded_at: uploadedAt
        },
        // PDF-specific optimizations
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          console.error('PDF upload error:', error);
          resolve({
            success: false,
            error: error.message || 'Failed to upload PDF'
          });
        } else if (result) {
          resolve({
            success: true,
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url
          });
        } else {
          resolve({
            success: false,
            error: 'Upload failed - no result returned'
          });
        }
      }
    ).end(file);
  });
};

// Utility function to delete PDF
export const deletePDF = async (publicId: string): Promise<PDFDeleteResult> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });
    
    if (result.result === 'ok') {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.result || 'Failed to delete PDF'
      };
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Utility function to get PDF information
export const getPDFInfo = async (publicId: string): Promise<PDFInfoResult> => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'raw'
    });

    if (result) {
      return {
        success: true,
        pdf: {
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          fileName: result.context?.original_name || result.public_id,
          size: result.bytes,
          format: result.format,
          uploadedAt: result.context?.uploaded_at || result.created_at,
          uploadedBy: result.context?.uploaded_by || 'unknown',
          folder: result.folder || 'lms/documents',
          description: result.context?.description || ''
        }
      };
    } else {
      return {
        success: false,
        error: 'PDF not found'
      };
    }
  } catch (error) {
    console.error('Error getting PDF info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Video Upload Options Interface
export interface VideoUploadOptions {
  folder?: string;
  description?: string;
  originalName?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

// Video Upload Result Interface
export interface VideoUploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  secureUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// Utility function to upload video
export const uploadVideo = async (file: Buffer, options: VideoUploadOptions = {}): Promise<VideoUploadResult> => {
  return new Promise((resolve) => {
    const {
      folder = 'lms/course-reviews',
      description = '',
      originalName = 'video',
      uploadedBy = 'unknown',
      uploadedAt = new Date().toISOString()
    } = options;

    // Generate unique public ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const publicId = `${folder}/${originalName.replace(/\.[^/.]+$/, '')}_${timestamp}_${randomId}`;

    cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: 'video',
        tags: ['lms', 'course-review', 'video'],
        context: {
          description: description,
          original_name: originalName,
          uploaded_by: uploadedBy,
          uploaded_at: uploadedAt
        },
        // Video-specific optimizations
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ],
        // Enable eager transformations for video thumbnails
        eager: [
          { width: 400, height: 300, crop: 'fill', format: 'jpg' }
        ],
        eager_async: false
      },
      (error, result) => {
        if (error) {
          console.error('Video upload error:', error);
          resolve({
            success: false,
            error: error.message || 'Failed to upload video'
          });
        } else if (result) {
          // Get thumbnail from eager transformations or generate URL
          let thumbnailUrl = null;
          if (result.eager && result.eager.length > 0) {
            thumbnailUrl = result.eager[0].secure_url || result.eager[0].url;
          } else if (result.public_id) {
            // Generate thumbnail URL from public_id
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
            thumbnailUrl = `https://res.cloudinary.com/${cloudName}/video/upload/w_400,h_300,c_fill,q_auto,f_jpg/${result.public_id}.jpg`;
          }
          
          resolve({
            success: true,
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            thumbnailUrl: thumbnailUrl
          });
        } else {
          resolve({
            success: false,
            error: 'Upload failed - no result returned'
          });
        }
      }
    ).end(file);
  });
};

// Utility function to delete video
export const deleteVideo = async (publicId: string): Promise<PDFDeleteResult> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    
    if (result.result === 'ok') {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.result || 'Failed to delete video'
      };
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
