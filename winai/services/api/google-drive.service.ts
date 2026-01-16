import { httpClient } from './http-client';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    iconLink?: string;
    thumbnailLink?: string;
    webViewLink?: string;
    size?: number;
    isFolder: boolean;
}

export interface DriveConnectionStatus {
    connected: boolean;
    email?: string;
    message: string;
}

export const googleDriveService = {
    /**
     * Get connection status
     */
    async getStatus(): Promise<DriveConnectionStatus> {
        const response = await httpClient.get<DriveConnectionStatus>('/drive/status');
        return response;
    },

    /**
     * Get authorization URL and redirect user
     */
    async authorize(): Promise<void> {
        const response = await httpClient.get<{ authUrl: string }>('/drive/authorize');
        window.location.href = response.authUrl;
    },

    /**
     * List files from a folder
     */
    async listFiles(folderId: string = 'root'): Promise<DriveFile[]> {
        const response = await httpClient.get<DriveFile[]>(`/drive/files?folderId=${folderId}`);
        return response;
    },

    /**
     * Disconnect Google Drive
     */
    async disconnect(): Promise<void> {
        await httpClient.delete('/drive/disconnect');
    }
};
