import React, { useState, useRef, useCallback } from 'react';
import type { KeyMoment } from './types';
import { analyzeFrame, generateFinalSummary } from './services/geminiService';
import { CameraIcon, SparklesIcon, DocumentTextIcon, LoaderIcon, PlayIcon } from './components/icons';

const App: React.FC = () => {
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);
  const [finalSummary, setFinalSummary] = useState<string>('');
  const [isLoadingFrame, setIsLoadingFrame] = useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadStream = () => {
    setError(null);
    if (streamUrl) {
      setVideoSrc(streamUrl);
    } else {
      setError("Please enter a valid video stream URL.");
    }
  };

  const handleCaptureAndAnalyze = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);
    setIsLoadingFrame(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      const base64Image = imageDataUrl.split(',')[1];

      if (!base64Image) throw new Error("Could not extract image data.");

      const summary = await analyzeFrame(base64Image);

      setKeyMoments(prev => [...prev, {
        id: Date.now(),
        imageDataUrl,
        summary
      }]);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while analyzing the frame.");
    } finally {
      setIsLoadingFrame(false);
    }
  }, []);

  const handleGenerateFinalSummary = useCallback(async () => {
    if (keyMoments.length < 1) return;
    setError(null);
    setIsLoadingSummary(true);
    setFinalSummary('');

    try {
      const summaries = keyMoments.map(km => km.summary);
      const summary = await generateFinalSummary(summaries);
      setFinalSummary(summary);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while generating the final summary.");
    } finally {
      setIsLoadingSummary(false);
    }
  }, [keyMoments]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Live Lecture Summarizer
          </h1>
          <p className="mt-2 text-lg text-gray-400">Capture key moments from a live stream and let Gemini summarize them for you.</p>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Video and Controls */}
          <div className="bg-gray-800/50 rounded-2xl p-6 ring-1 ring-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center"><CameraIcon className="w-6 h-6 mr-2" />Controls & Video Feed</h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="Enter web-accessible video stream URL (e.g., .m3u8)"
                  className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                />
                <button
                  onClick={handleLoadStream}
                  className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayIcon className="w-5 h-5 mr-2"/>
                  Load Stream
                </button>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-gray-700">
                {videoSrc ? (
                  <video ref={videoRef} src={videoSrc} controls crossOrigin="anonymous" className="w-full h-full" onPlay={() => setError(null)} onError={() => setError("Could not load video. Ensure the URL is correct and the stream is web-accessible (CORS enabled).")}></video>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <p>Video stream will appear here</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleCaptureAndAnalyze}
                disabled={!videoSrc || isLoadingFrame}
                className="w-full flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingFrame ? <LoaderIcon className="w-5 h-5 mr-2"/> : <SparklesIcon className="w-5 h-5 mr-2"/>}
                {isLoadingFrame ? 'Analyzing Frame...' : 'Capture & Analyze Frame'}
              </button>
            </div>
          </div>

          {/* Right Column: Summaries and Key Moments */}
          <div className="bg-gray-800/50 rounded-2xl p-6 ring-1 ring-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 flex items-center"><DocumentTextIcon className="w-6 h-6 mr-2" />Summaries</h2>
            
            <div className="space-y-6">
              <div>
                <button
                  onClick={handleGenerateFinalSummary}
                  disabled={keyMoments.length < 2 || isLoadingSummary}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingSummary ? <LoaderIcon className="w-5 h-5 mr-2"/> : <SparklesIcon className="w-5 h-5 mr-2"/>}
                  {isLoadingSummary ? 'Generating...' : `Generate Final Summary (${keyMoments.length} moments)`}
                </button>
                <div className="mt-4 p-4 bg-gray-900/70 rounded-lg min-h-[100px] border border-gray-700 whitespace-pre-wrap">
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">Overall Summary</h3>
                  {finalSummary || <span className="text-gray-500">Your final summary will appear here...</span>}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Key Moments</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {keyMoments.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Captured frames and their summaries will be listed here.</p>
                  )}
                  {keyMoments.slice().reverse().map((moment) => (
                    <div key={moment.id} className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4 border border-gray-700">
                      <img src={moment.imageDataUrl} alt="Captured frame" className="w-full sm:w-32 h-auto object-cover rounded-md flex-shrink-0" />
                      <p className="text-gray-300 text-sm">{moment.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
