import React, { useState } from 'react';
import { 
  Download, 
  Music, 
  Video, 
  Clock, 
  User, 
  Eye, 
  Check, 
  SlidersHorizontal,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { VideoMetadata, StreamFormat } from '../types/index.js';
import { PLATFORMS_DATA, formatBytes } from '../utils/platforms.js';

interface MediaInspectorCardProps {
  metadata: VideoMetadata;
  onStartDownload: (formatId: string, isAudioOnly: boolean) => void;
  isStartingJob: boolean;
}

export const MediaInspectorCard: React.FC<MediaInspectorCardProps> = ({
  metadata,
  onStartDownload,
  isStartingJob,
}) => {
  const platform = PLATFORMS_DATA[metadata.platform] || PLATFORMS_DATA.generic;
  
  const videoFormats = metadata.formats.filter(f => !f.isAudioOnly);
  const audioFormat = metadata.formats.find(f => f.isAudioOnly);

  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    videoFormats[0]?.formatId || 'best'
  );
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const currentSelectedFormat = metadata.formats.find(f => f.formatId === selectedFormatId) || videoFormats[0];

  const handleDownload = () => {
    if (activeTab === 'audio') {
      onStartDownload('bestaudio_mp3', true);
    } else {
      onStartDownload(selectedFormatId, false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Banner Bar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${platform.badgeBg} ${platform.badgeText} ${platform.borderColor}`}>
            {platform.name}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Inspected stream ready</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{metadata.durationFormatted}</span>
          </div>
          {metadata.viewCount !== undefined && metadata.viewCount > 0 && (
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{metadata.viewCount.toLocaleString()} views</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left: Thumbnail Preview */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group shadow-md">
            {metadata.thumbnail ? (
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Video className="w-12 h-12" />
              </div>
            )}
            
            {/* Duration Tag */}
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[11px] font-mono font-medium text-white shadow-md">
              {metadata.durationFormatted}
            </div>

            {/* Quality pill overlay */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
              {videoFormats[0]?.resolution || 'HD Stream'}
            </div>
          </div>

          {/* Author & Source */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                {metadata.author || 'Creator'}
              </span>
            </div>
            <a
              href={metadata.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <span>Original Post</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Right: Media Title & Format Chooser */}
        <div className="md:col-span-7 flex flex-col">
          {/* Title */}
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug mb-4">
            {metadata.title}
          </h2>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-5 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video (MP4 HD)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Audio Only (MP3)</span>
            </button>
          </div>

          {activeTab === 'video' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                  Select Output Resolution:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {videoFormats.slice(0, 6).map((format) => {
                    const isSelected = selectedFormatId === format.formatId;
                    const is4K = format.resolution.includes('4K') || (format.height && format.height >= 2160);
                    const is1080p = format.resolution.includes('1080p');

                    return (
                      <button
                        key={format.formatId}
                        type="button"
                        onClick={() => setSelectedFormatId(format.formatId)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                            : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                            {format.resolution}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>{format.ext.toUpperCase()}</span>
                          {format.filesizeApprox ? (
                            <span>{formatBytes(format.filesizeApprox)}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Auto</span>
                          )}
                        </div>
                        {is4K && (
                          <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded text-[9px] font-bold">
                            Ultra HD
                          </span>
                        )}
                        {!is4K && is1080p && (
                          <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-bold">
                            Crisp 1080p
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Technical Inspection Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors py-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Stream codec & container specifications</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                </button>

                {showTechnicalDetails && currentSelectedFormat && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Container:</span>
                      <span className="text-slate-900 dark:text-white">MP4 (MPEG-4 Container)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Video Codec:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{currentSelectedFormat.vcodec || 'H.264 / AV1'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Audio Muxing:</span>
                      <span className="text-teal-700 dark:text-teal-400">Best Audio (AAC / Opus)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Muxing Engine:</span>
                      <span className="text-emerald-600 dark:text-emerald-300">FFmpeg DASH Remux</span>
                    </div>
                    {currentSelectedFormat.fps && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Frame Rate:</span>
                        <span>{currentSelectedFormat.fps} fps</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Audio Only Tab */
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Lossless MP3 Audio Extraction</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Extracts source soundtrack and converts with FFmpeg to 320 kbps MP3.</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                <span>Bitrate: 320 kbps VBR/CBR</span>
                <span>Container: .mp3</span>
              </div>
            </div>
          )}

          {/* Primary Download Trigger Button */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isStartingJob}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.99] transition-all shadow-xl shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isStartingJob ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Queueing Job...</span>
                </>
              ) : activeTab === 'audio' ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download MP3 Audio (320kbps)</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {currentSelectedFormat?.resolution || 'HD Video'} (.MP4)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2">
              Adaptive streams automatically merged with FFmpeg into universal MP4. No watermarks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
