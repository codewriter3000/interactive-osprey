import { createContext, useContext, createSignal, type JSX } from "solid-js";

export interface Channel {
  name: string;
  number: string;
  logo?: string;
  streamUrl?: string;
  raw?: string;
  tvg?: {
    logo?: string;
    id?: string;
  };
  group?: {
    title?: string;
  };
  url?: string;
}

export type AppScreen = "channelGuide" | "watchingTV" | "mainMenu";

export interface TVContextType {
  // Channel state
  currentChannel: () => Channel | null;
  setCurrentChannel: (channel: Channel | null) => void;
  channelStreamUrl: () => string;
  setChannelStreamUrl: (url: string) => void;
  isPlaying: () => boolean;
  setIsPlaying: (playing: boolean) => void;

  // Screen navigation state
  currentScreen: () => AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;

  // Navigation API
  goToChannelGuide: () => void;
  goToWatchingTV: () => void;
  goToMainMenu: () => void;
  goBack: () => void;

  // Navigation history
  previousScreen: () => AppScreen | null;
}

const TVContext = createContext<TVContextType>();

export function TVProvider(props: { children: JSX.Element }) {
  const [currentChannel, setCurrentChannel] = createSignal<Channel | null>(null);
  const [channelStreamUrl, setChannelStreamUrl] = createSignal(
    localStorage.getItem("channelStreamUrl") || ""
  );
  const [isPlaying, setIsPlaying] = createSignal(false);

  // Screen navigation state
  const [currentScreen, setCurrentScreen] = createSignal<AppScreen>(
    localStorage.getItem("channelStreamUrl") ? "watchingTV" : "channelGuide"
  );
  const [previousScreen, setPreviousScreen] = createSignal<AppScreen | null>(null);

  // Update localStorage when stream URL changes
  const updateChannelStreamUrl = (url: string) => {
    setChannelStreamUrl(url);
    localStorage.setItem("channelStreamUrl", url);

    // Auto-navigate to watching TV when a stream URL is set
    if (url && currentScreen() !== "watchingTV") {
      goToWatchingTV();
    }
  };

  // Navigation API
  const goToChannelGuide = () => {
    setPreviousScreen(currentScreen());
    setCurrentScreen("channelGuide");
  };

  const goToWatchingTV = () => {
    setPreviousScreen(currentScreen());
    setCurrentScreen("watchingTV");
  };

  const goToMainMenu = () => {
    setPreviousScreen(currentScreen());
    setCurrentScreen("mainMenu");
  };

  const goBack = () => {
    const prev = previousScreen();
    if (prev) {
      const current = currentScreen();
      setCurrentScreen(prev);
      setPreviousScreen(current);
    }
  };

  const contextValue: TVContextType = {
    // Channel state
    currentChannel,
    setCurrentChannel,
    channelStreamUrl,
    setChannelStreamUrl: updateChannelStreamUrl,
    isPlaying,
    setIsPlaying,

    // Screen navigation state
    currentScreen,
    setCurrentScreen,

    // Navigation API
    goToChannelGuide,
    goToWatchingTV,
    goToMainMenu,
    goBack,

    // Navigation history
    previousScreen,
  };

  return (
    <TVContext.Provider value={contextValue}>
      {props.children}
    </TVContext.Provider>
  );
}

export function useTVContext() {
  const context = useContext(TVContext);
  if (!context) {
    throw new Error("useTVContext must be used within a TVProvider");
  }
  return context;
}

// Convenience hooks for specific parts of the context
export function useCurrentChannel() {
  const { currentChannel } = useTVContext();
  return currentChannel;
}

export function useChannelStream() {
  const { channelStreamUrl, setChannelStreamUrl } = useTVContext();
  return { channelStreamUrl, setChannelStreamUrl };
}

export function useScreenNavigation() {
  const {
    currentScreen,
    goToChannelGuide,
    goToWatchingTV,
    goToMainMenu,
    goBack,
    previousScreen
  } = useTVContext();
  return {
    currentScreen,
    goToChannelGuide,
    goToWatchingTV,
    goToMainMenu,
    goBack,
    previousScreen
  };
}

export function useAppScreen() {
  const { currentScreen, setCurrentScreen } = useTVContext();
  return { currentScreen, setCurrentScreen };
}