
import VideoJS from "@ui/VideoPlayer/player-core/VideoJS";
import React, {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMeasure, useUpdateEffect } from "react-use";
import Player from "video.js/dist/types/player";
import ChapterAutoPlayModal from "./ChapterAutoPlayModal";
import { Chapter } from "../constants";
import BigPlayButton from "./control-bar/BigPlayButton";
import CustomControl from "./control-bar/CustomControl";
import useGetCurrentChapter from "./hooks/useGetCurrentChapter";
import { usePlayerActive } from "./hooks/usePlayerActive";
import usePlayNextChapter from "./hooks/usePlayNextChapter";
import usePreventDefaultHotkeys from "./hooks/usePreventDefaultHotkeys";
import { SeekStatuses, useSeek } from "./hooks/useSeek";
import useShareModal from "./hooks/useShareModal";
import { useToggleFullscreen } from "./hooks/useToggleFullscreen";
import useVideoJSOptions from "./hooks/useVideoJSOptions";
import { useVolume } from "./hooks/useVolume";
import ShareModal from "./share/ShareModal";
import { isFinalChapter } from "./utils";
import "./player-overrides.css";

export type PlayerRef = React.MutableRefObject<Player | null>;

type VideoPlayerCoreProps = {
  playerRef: PlayerRef;
  currentChapter: string;
  setCurrentChapter: (chapter: string) => void;
  chapters: Chapter[];
  initialActiveChapter: string;
  onChapterChange?: (currentChapter: string) => void;
  embedded?: boolean;
  videoWrapperStyle: CSSProperties;
  videoPositionStyle: CSSProperties;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onContainerHeightChange?: (height: number) => void;
  onPlayingStatusChange?: (playingStatus: SeekStatuses) => void;
  renderChapter: (options: {
    chapter: Chapter;
    episode: number;
    isVisible: boolean;
  }) => React.ReactNode;
};
export function VideoPlayerCore({
  playerRef,
  chapters,
  currentChapter,
  setCurrentChapter,
  onChapterChange,
  videoWrapperStyle,
  videoPositionStyle,
  embedded,
  onFullscreenChange,
  onContainerHeightChange,
  onPlayingStatusChange,
  renderChapter,
}: VideoPlayerCoreProps) {
  const [bufferPercent, setBufferPercent] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [videoContainerRef, { height }] = useMeasure<HTMLDivElement>();
  const [isBigPlayBtnVisible, setIsBigPlayBtnVisible] = useState(true);
  const currentChapterRef = useRef(currentChapter);

  const {
    ref: videoWrapperRef,
    toggleFullscreen,
    isFullscreen,
  } = useToggleFullscreen();

  const isPlayerActive = usePlayerActive(videoWrapperRef);

  const {
    volume,
    isMuted,
    toggleMute,
    onVolumeScrubStart,
    onVolumeScrubChange,
    onVolumeScrubEnd,
    isInteractingWithVolume,
    setVolume,
  } = useVolume({
    playerRef,
  });

  const {
    playingStatus,
    currentTime,
    onPlayToggle,
    onSeekScrubStart,
    onSeekScrubChange,
    onSeekScrubEnd,
    setCurrentTime,
    setPlayingStatus,
  } = useSeek({ totalDuration, playerRef });

  const { onShareModalClose, onShareModalOpen, isShareModalOpen } =
    useShareModal({
      playerRef,
      playingStatus,
    });

  const { chapter, chapterIndex } = useGetCurrentChapter({
    chapters,
    currentChapter,
  });

  const {
    isPlayNextModalOpen,
    openPlayNextModal,
    closePlayNextModal,
    playNextChapter,
  } = usePlayNextChapter({
    chapters,
    currentChapter,
    playingStatus,
    setCurrentChapter,
  });

  const videojsOptions = useVideoJSOptions({
    chapters,
    currentChapter,
  });

  usePreventDefaultHotkeys();

  useUpdateEffect(() => {
    onChapterChange?.(currentChapter);
    playerRef.current?.play();
    currentChapterRef.current = currentChapter;
  }, [currentChapter]);

  useEffect(() => {
    setIsBigPlayBtnVisible(playingStatus === "unstarted");
  }, [playingStatus]);

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);
  useEffect(() => {
    onContainerHeightChange?.(height);
  }, [height, onContainerHeightChange]);

  useEffect(() => {
    onPlayingStatusChange?.(playingStatus);
  }, [playingStatus, onPlayingStatusChange]);

  const handlePlayerReady = (player: any) => {
    playerRef.current = player;

    // You can handle player events here, for example:
    player.on("waiting", () => {
      // videojs.log('player is waiting')
    });

    player.on("dispose", () => {
      // videojs.log('player will dispose')
    });

    player.on("timeupdate", function () {
      const playerTime = playerRef.current?.currentTime();
      if (playerTime === undefined) {
        return;
      }

      setCurrentTime(playerTime);
    });

    player.on("progress", function () {
      const buffer = playerRef.current?.bufferedPercent();
      setBufferPercent(buffer || 0);
    });

    player.on("dblclick", function () {
      toggleFullscreen();
    });

    player.on("durationchange", function () {
      if (playerRef.current) {
        const duration = playerRef.current.duration();
        setCurrentTime(0);
        setTotalDuration(duration);
      }
    });

    player.on("ended", function () {
      setPlayingStatus("ended");
      if (!isFinalChapter(chapters, currentChapterRef.current)) {
        openPlayNextModal();
      }
    });

    player.on("pause", () => {
      setPlayingStatus("paused");
    });

    player.on("play", () => {
      setPlayingStatus("playing");
    });

    const volume = player.volume();
    setVolume(volume * 100);
    setCurrentChapter(currentChapter);
    player.aspectRatio("16:9");
  };

  const onBigPlayBtnClick = () => {
    playerRef.current?.play();
  };

  const isControlVisible = useMemo(() => {
    if (playingStatus === "unstarted") {
      return false;
    }

    if (playingStatus === "paused" || playingStatus === "ended") {
      return true;
    }
    return isPlayerActive || isInteractingWithVolume;
  }, [isInteractingWithVolume, isPlayerActive, playingStatus]);

  return (
    <div style={videoWrapperStyle} ref={videoWrapperRef}>
      <div style={videoPositionStyle} onClick={onPlayToggle}>
        <VideoJS
          options={videojsOptions}
          onReady={handlePlayerReady}
          videoContainerRef={videoContainerRef}
        />
      </div>
      <ChapterAutoPlayModal
        isOpen={isPlayNextModalOpen}
        onPlayNextChapter={playNextChapter}
        positionStyle={videoPositionStyle}
      />
      <BigPlayButton
        onClick={onBigPlayBtnClick}
        positionStyle={videoPositionStyle}
        isVisible={isBigPlayBtnVisible}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={onShareModalClose}
        chapter={chapter || chapters[0]}
        embedded={embedded}
      />
      {chapter &&
        renderChapter({
          chapter,
          episode: chapterIndex + 1,
          isVisible: isControlVisible,
        })}
      {chapter && (
        <CustomControl
          chapter={chapter}
          playingStatus={playingStatus}
          isControlVisible={isControlVisible}
          totalDuration={totalDuration}
          currentTime={currentTime}
          onSeekScrubStart={(n) => {
            if (isPlayNextModalOpen) {
              closePlayNextModal();
            }
            onSeekScrubStart(n);
          }}
          onSeekScrubEnd={(time) => {
            if (playingStatus === "ended") {
              setPlayingStatus("paused");
            }

            onSeekScrubEnd(time);
          }}
          onSeekScrubChange={onSeekScrubChange}
          bufferPosition={totalDuration * bufferPercent}
          onPlayToggle={onPlayToggle}
          isMuted={isMuted}
          toggleMute={toggleMute}
          onVolumeScrubChange={onVolumeScrubChange}
          onVolumeScrubStart={onVolumeScrubStart}
          onVolumeScrubEnd={onVolumeScrubEnd}
          isInteractingWithVolume={isInteractingWithVolume}
          volume={volume}
          toggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onShare={onShareModalOpen}
        />
      )}
    </div>
  );
}
