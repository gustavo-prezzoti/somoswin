import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    duration?: number;
    transcription?: string;
    fromMe?: boolean;
    messageId: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    src,
    duration,
    transcription,
    fromMe = false,
    messageId
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const [isLoaded, setIsLoaded] = useState(false);

    // Gerar "waveform" fake baseado no messageId para consistência
    const generateWaveform = useCallback(() => {
        const bars = 35;
        const waveform: number[] = [];
        // Usar messageId como seed para gerar padrão consistente
        let seed = messageId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        for (let i = 0; i < bars; i++) {
            seed = (seed * 9301 + 49297) % 233280;
            const height = 0.2 + (seed / 233280) * 0.8;
            waveform.push(height);
        }
        return waveform;
    }, [messageId]);

    const [waveform] = useState(generateWaveform);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setAudioDuration(audio.duration);
            setIsLoaded(true);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleError = () => {
            setIsPlaying(false);
            console.error('Erro ao carregar áudio');
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        const progressBar = progressRef.current;
        if (!audio || !progressBar || !audioDuration) return;

        const rect = progressBar.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = clickPosition * audioDuration;

        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    // Cores baseadas em quem enviou
    const playButtonBg = fromMe ? 'bg-white/20 hover:bg-white/30' : 'bg-emerald-100 hover:bg-emerald-200';
    const playButtonIcon = fromMe ? 'text-white' : 'text-emerald-600';
    const waveformActive = fromMe ? 'bg-white' : 'bg-emerald-500';
    const waveformInactive = fromMe ? 'bg-white/30' : 'bg-gray-300';
    const timeColor = fromMe ? 'text-white/70' : 'text-gray-500';
    const transcriptionColor = fromMe ? 'text-white/70' : 'text-gray-500';

    return (
        <div className="flex flex-col gap-2 min-w-[240px] max-w-[320px]">
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-sm ${playButtonBg}`}
                >
                    {isPlaying ? (
                        <Pause size={20} className={playButtonIcon} />
                    ) : (
                        <Play size={20} className={`${playButtonIcon} ml-0.5`} />
                    )}
                </button>

                {/* Waveform Progress */}
                <div className="flex-1 flex flex-col gap-1.5">
                    <div
                        ref={progressRef}
                        onClick={handleProgressClick}
                        className="flex items-end gap-[2px] h-8 cursor-pointer group"
                    >
                        {waveform.map((height, index) => {
                            const barProgress = (index / waveform.length) * 100;
                            const isActive = barProgress <= progress;

                            return (
                                <div
                                    key={index}
                                    className={`flex-1 rounded-full transition-all duration-75 ${isActive ? waveformActive : waveformInactive
                                        } ${isPlaying && isActive ? 'animate-pulse' : ''}`}
                                    style={{
                                        height: `${height * 100}%`,
                                        minHeight: '4px',
                                        opacity: isActive ? 1 : 0.6,
                                        transform: isPlaying && isActive ? `scaleY(${1 + Math.sin(Date.now() / 200 + index) * 0.1})` : 'scaleY(1)'
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Time Display */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Mic size={10} className={timeColor} />
                            <span className={`text-[10px] font-medium ${timeColor}`}>
                                {isPlaying || currentTime > 0
                                    ? formatTime(currentTime)
                                    : formatTime(audioDuration || duration || 0)}
                            </span>
                        </div>
                        {audioDuration > 0 && (
                            <span className={`text-[10px] ${timeColor}`}>
                                {formatTime(audioDuration)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Transcription */}
            {transcription && (
                <p className={`text-[11px] italic ${transcriptionColor} border-t ${fromMe ? 'border-white/10' : 'border-gray-100'} pt-2 mt-1`}>
                    "{transcription}"
                </p>
            )}
        </div>
    );
};

export default AudioPlayer;
