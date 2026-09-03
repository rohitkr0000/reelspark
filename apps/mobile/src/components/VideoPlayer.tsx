import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { youtubeEmbedHtml } from './youtubeEmbedHtml';
import {
  INSTAGRAM_EXTRA_HEIGHT_PX,
  INSTAGRAM_HEADER_PX,
  instagramReelEmbedSrc,
} from './instagramEmbedHtml';

export interface VideoPlayerProps {
  platform: 'youtube' | 'instagram';
  videoId: string;
  playing: boolean;
  onEnded?: () => void;
  style?: StyleProp<ViewStyle>;
}

// The player is a DOM <iframe>. YouTube reuses the shared IFrame-API HTML via
// srcDoc (origin = this page's origin); Instagram loads its /embed/ page directly
// (a nested srcDoc frame, or a CSS-transformed iframe on mobile, stopped IG
// playing on tap) and hides IG's chrome with plain layout offsets.
export function VideoPlayer({ platform, videoId, playing, onEnded, style }: VideoPlayerProps) {
  const isYouTube = platform === 'youtube';

  useEffect(() => {
    if (!playing || !isYouTube || !onEnded) return;
    function onMessage(e: MessageEvent) {
      if (e.data === 'ended') onEnded?.();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [playing, isYouTube, onEnded]);

  if (!playing) return null;

  if (isYouTube) {
    return (
      <View style={[styles.fill, style]}>
        <iframe
          title="YouTube video player"
          srcDoc={youtubeEmbedHtml(videoId, window.location.origin)}
          style={{ width: '100%', height: '100%', border: '0', display: 'block', backgroundColor: '#000' }}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </View>
    );
  }

  // Instagram: its /embed/ page has no chromeless/API mode, so we clip it and
  // offset the iframe with plain layout (no CSS transform — that breaks touch
  // taps on mobile) so IG's header/footer sit outside the clip. IG can't
  // autoplay and its centre play button is inside its own cross-origin
  // document — one tap on it starts the reel.
  return (
    <View style={[styles.fill, style]}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
        <iframe
          title="Instagram video player"
          src={instagramReelEmbedSrc(videoId)}
          scrolling="no"
          style={{
            position: 'absolute',
            left: 0,
            top: `-${INSTAGRAM_HEADER_PX}px`,
            width: '100%',
            height: `calc(100% + ${INSTAGRAM_HEADER_PX + INSTAGRAM_EXTRA_HEIGHT_PX}px)`,
            border: '0',
            display: 'block',
            background: '#000',
          }}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', overflow: 'hidden' },
});
