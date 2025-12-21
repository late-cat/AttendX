/**
 * Firebase Storage Utilities for Frontend
 * Upload and manage files in Firebase Storage (Original Quality - No Compression)
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a single image to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (e.g., 'students/john_doe/1.jpg')
 * @returns {Promise<string>} - Download URL
 */
export async function uploadImage(file, path) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('✅ Uploaded:', path);
    return downloadURL;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Upload multiple images for a student
 * @param {File[]} files - Array of image files
 * @param {string} studentName - Student name
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<string[]>} - Array of download URLs
 */
export async function uploadStudentImages(files, studentName, onProgress = null) {
  const totalFiles = files.length;
  let uploadedCount = 0;

  const uploadPromises = files.map(async (file, index) => {
    const timestamp = Date.now();
    const path = `students/${studentName}/${timestamp}_${index + 1}.jpg`;

    const url = await uploadImage(file, path);

    uploadedCount++;
    if (onProgress) {
      onProgress(Math.round((uploadedCount / totalFiles) * 100));
    }

    return url;
  });

  return Promise.all(uploadPromises);
}

/**
 * Upload webcam image for attendance
 * @param {Blob} blob - Image blob from webcam
 * @param {string} studentName - Student name
 * @returns {Promise<string>} - Download URL
 */
export async function uploadWebcamImage(blob, studentName = 'unknown') {
  const timestamp = Date.now();
  const date = new Date().toISOString().split('T')[0];
  const path = `attendance/${date}/${studentName}_${timestamp}.jpg`;

  const file = new File([blob], `${timestamp}.jpg`, { type: 'image/jpeg' });
  return uploadImage(file, path);
}

/**
 * Delete a file from Firebase Storage
 * @param {string} path - Storage path to delete
 */
export async function deleteImage(path) {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('✅ Deleted:', path);
  } catch (error) {
    console.error('❌ Delete failed:', error);
    throw error;
  }
}
