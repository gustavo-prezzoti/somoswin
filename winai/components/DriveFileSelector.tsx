import React, { useState, useEffect } from 'react';
import { googleDriveService, DriveFile, DriveConnectionStatus } from '../services/api/google-drive.service';
import { Database, Folder, File, ChevronRight, ArrowLeft, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface DriveFileSelectorProps {
    onSelect: (file: DriveFile) => void;
    onCancel: () => void;
}

const DriveFileSelector: React.FC<DriveFileSelectorProps> = ({ onSelect, onCancel }) => {
    const [status, setStatus] = useState<DriveConnectionStatus | null>(null);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string, name: string }[]>([{ id: 'root', name: 'Meu Drive' }]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const statusData = await googleDriveService.getStatus();
            setStatus(statusData);
            if (statusData.connected) {
                loadFiles('root');
            } else {
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao verificar conexão com Google Drive');
            setIsLoading(false);
        }
    };

    const loadFiles = async (folderId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const fileList = await googleDriveService.listFiles(folderId);
            setFiles(fileList);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar arquivos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            await googleDriveService.authorize();
        } catch (err) {
            setError('Erro ao iniciar autorização');
        }
    };

    const handleDisconnect = async () => {
        if (confirm('Tem certeza que deseja desconectar do Google Drive?')) {
            try {
                await googleDriveService.disconnect();
                setStatus({ connected: false, message: 'Desconectado' });
                setFiles([]);
            } catch (err) {
                setError('Erro ao desconectar');
            }
        }
    };

    const navigateToFolder = (folderId: string, folderName: string) => {
        const newBreadcrumbs = [...breadcrumbs, { id: folderId, name: folderName }];
        setBreadcrumbs(newBreadcrumbs);
        loadFiles(folderId);
    };

    const navigateUp = (index: number) => {
        const targetFolder = breadcrumbs[index];
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        loadFiles(targetFolder.id);
    };

    if (isLoading && !status) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-gray-500 font-medium">Conectando ao Drive...</p>
            </div>
        );
    }

    if (status && !status.connected) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in fade-in">
                <div className="bg-emerald-50 p-6 rounded-full">
                    <Database size={48} className="text-emerald-600" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Conectar Google Drive</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        Conecte sua conta para acessar seus criativos, imagens e vídeos diretamente do Drive.
                    </p>
                </div>
                <button
                    onClick={handleConnect}
                    className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                >
                    <Database size={18} />
                    Conectar Agora
                </button>
                <button onClick={onCancel} className="text-gray-400 text-sm hover:text-gray-600">
                    Cancelar
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] animate-in fade-in">
            {/* Header with Breadcrumbs */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center text-sm font-medium text-gray-600 overflow-hidden">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id}>
                            {index > 0 && <ChevronRight size={14} className="mx-1 text-gray-400 flex-shrink-0" />}
                            <button
                                onClick={() => navigateUp(index)}
                                className={`hover:text-emerald-600 transition-colors whitespace-nowrap ${index === breadcrumbs.length - 1 ? 'font-bold text-gray-900' : ''}`}
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {status?.email && (
                        <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">
                            {status.email}
                        </span>
                    )}
                    <button
                        onClick={handleDisconnect}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="Desconectar"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-2">
                        <Loader2 className="animate-spin text-emerald-600" size={24} />
                        <p className="text-xs text-gray-400">Carregando arquivos...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                        <AlertCircle className="text-red-500" size={32} />
                        <p className="text-red-600 font-medium">{error}</p>
                        <button onClick={() => loadFiles(breadcrumbs[breadcrumbs.length - 1].id)} className="text-xs text-emerald-600 font-bold underline">
                            Tentar novamente
                        </button>
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                        <Folder size={32} className="opacity-20" />
                        <p>Pasta vazia</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {files.map(file => (
                            <div
                                key={file.id}
                                onClick={() => file.isFolder ? navigateToFolder(file.id, file.name) : onSelect(file)}
                                className={`
                  group relative flex flex-col items-center p-4 rounded-xl border border-gray-100 bg-white cursor-pointer transition-all
                  ${file.isFolder ? 'hover:bg-emerald-50/50 hover:border-emerald-200' : 'hover:shadow-md hover:border-emerald-200'}
                `}
                            >
                                <div className="mb-3 relative">
                                    {file.thumbnailLink ? (
                                        <img
                                            src={file.thumbnailLink}
                                            alt={file.name}
                                            className="w-16 h-16 object-cover rounded-lg shadow-sm"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${file.isFolder ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {file.isFolder ? <Folder size={32} /> : <File size={32} />}
                                        </div>
                                    )}
                                    {file.isFolder && (
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                                            <ChevronRight size={10} className="text-emerald-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center w-full">
                                    <p className="text-xs font-bold text-gray-700 truncate w-full px-2" title={file.name}>
                                        {file.name}
                                    </p>
                                    {!file.isFolder && file.size && (
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {(file.size / 1024 / 1024).toFixed(1)} MB
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <button onClick={onCancel} className="text-xs font-bold text-gray-500 hover:text-gray-800">
                    Cancelar
                </button>
                <div className="text-[10px] text-gray-400">
                    Google Drive Integration
                </div>
            </div>
        </div>
    );
};

export default DriveFileSelector;
