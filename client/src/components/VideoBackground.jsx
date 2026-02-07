import React, { useEffect, useRef, useState } from 'react'

// Pool of HLS video URLs
const VIDEO_POOL = [
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/90bb1b34646b81b3b63e5a854ea00da3/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/df176a2fb2ea2b64bd21ae1c10d3af6a/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/964cb3eddff1a67e3772aac9a7aceea2/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/dd17599dfa77f41517133fa7a4967535/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/408ad52e3f15bc8f01ae69d194a8cf3a/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/e923e67d71fed3e0853ec57f0348451e/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/136a8a211c6c3b1cc1fd7b1c7d836c58/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/c9ddd33ac3d964e5d33b31ce849e8f95/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/257c7359efd4b4aaebcc03aa8fc78a36/manifest/video.m3u8",
  "https://customer-cbeadsgr09pnsezs.cloudflarestream.com/697945ca6b876878dba3b23fbd2f1561/manifest/video.m3u8"
]

// Get a random video URL from the pool
export function getRandomVideoUrl() {
  return VIDEO_POOL[Math.floor(Math.random() * VIDEO_POOL.length)]
}

// Get a specific video by index (for consistent assignment)
export function getVideoByIndex(index) {
  return VIDEO_POOL[index % VIDEO_POOL.length]
}

/**
 * VideoBackground - HLS video background component
 * Uses native HLS on Safari, HLS.js fallback for other browsers
 */
export default function VideoBackground({ 
  src, 
  overlayOpacity = 0.5, 
  className = '',
  objectFit = 'cover' 
}) {
  const videoRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Use provided src or random from pool
  const videoSrc = src || getRandomVideoUrl()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Check if browser supports HLS natively (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc
      video.play().catch(() => {})
    } else {
      // Use HLS.js for other browsers
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          })
          hls.loadSource(videoSrc)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {})
          })
          
          return () => {
            hls.destroy()
          }
        }
      }).catch(() => {
        // Fallback: try direct playback
        video.src = videoSrc
        video.play().catch(() => {})
      })
    }
  }, [videoSrc])

  const handleLoadedData = () => {
    setIsLoaded(true)
  }

  return (
    <div className={`video-bg ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={handleLoadedData}
        style={{
          width: '100%',
          height: '100%',
          objectFit: objectFit,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.5s ease'
        }}
      />
      {overlayOpacity > 0 && (
        <div 
          className="video-overlay" 
          style={{ background: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
      )}
    </div>
  )
}
