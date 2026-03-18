import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

export async function uploadTaskAttachment(taskId: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    if (!storage) {
        throw new Error("Firebase Storage is not initialized.");
    }
    
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Must be logged in to upload attachments.");
    }

    // Create a unique filename to prevent collisions natively
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const path = `users/${user.uid}/tasks/${taskId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, path);

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                console.error("Upload failed", error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}
