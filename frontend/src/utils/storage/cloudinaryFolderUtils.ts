// Cloudinary Folder Creation Utility

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/**
 * Creates a folder in Cloudinary under the staging_evidence directory
 * @param caseId - The case ID to use as folder name
 * @returns Promise<boolean> - True if folder created successfully, false otherwise
 */
export const createCloudinaryFolder = async (caseId: string): Promise<boolean> => {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error("Missing Cloudinary configuration");
    return false;
  }

  if (!caseId) {
    console.error("Case ID is required for folder creation");
    return false;
  }

  try {
    // Cloudinary Admin API for folder creation
    const folderPath = `staging_evidence/${caseId}`;
    
    // Generate signature for authentication
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = generateSignature();

    const formData = new FormData();
    formData.append('cloud_name', CLOUD_NAME);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('public_id', folderPath);
    formData.append('folder', 'true');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary folder creation failed:", errorData);
      return false;
    }

    console.log(`✅ Cloudinary folder created: staging_evidence/${caseId}`);
    return true;

  } catch (error) {
    console.error("Error creating Cloudinary folder:", error);
    return false;
  }
};

/**
 * Generates signature for Cloudinary API authentication
 * Note: This would need to be done server-side for security
 * For now, we'll use the upload preset approach instead
 * @returns string - Empty string (not used in client-side implementation)
 */
const generateSignature = (): string => {
  // Client-side signature generation is not secure
  // This function is kept for reference but not used
  // We use upload preset approach instead
  return '';
};

/**
 * Alternative approach: Create folder by uploading a placeholder image
 * This works because Cloudinary auto-creates folders when files are uploaded
 * @param caseId - The case ID to use as folder name
 * @returns Promise<boolean> - True if folder created successfully, false otherwise
 */
export const createCloudinaryFolderViaUpload = async (caseId: string): Promise<boolean> => {
  if (!CLOUD_NAME || !import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) {
    console.error("Missing Cloudinary configuration");
    return false;
  }

  if (!caseId) {
    console.error("Case ID is required for folder creation");
    return false;
  }

  try {
    // Create a minimal placeholder file (1x1 transparent PNG)
    const placeholderData = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const blob = new Blob([placeholderData], { type: 'image/png' });
    const file = new File([blob], 'folder_placeholder.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `staging_evidence/${caseId}`);
    formData.append('public_id', `${caseId}/.folder_placeholder`);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary folder creation failed:", errorData);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Cloudinary folder created: staging_evidence/${caseId}`);
    console.log(`📁 Folder placeholder: ${data.secure_url}`);
    
    return true;

  } catch (error) {
    console.error("Error creating Cloudinary folder:", error);
    return false;
  }
};
