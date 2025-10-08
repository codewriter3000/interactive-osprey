// TVContext Usage Examples

import { useTVContext, useScreenNavigation, useCurrentChannel, useChannelStream } from "./contexts/TVContext.tsx";

// Example 1: Full context usage
function ExampleComponent() {
  const context = useTVContext();

  const handleChannelChange = (channel) => {
    context.setCurrentChannel(channel);
    context.setChannelStreamUrl(channel.url);
    // This will automatically navigate to "watchingTV"
  };

  return <div>Current Screen: {context.currentScreen()}</div>;
}

// Example 2: Screen navigation
function NavigationComponent() {
  const {
    currentScreen,
    goToChannelGuide,
    goToWatchingTV,
    goToMainMenu,
    goBack
  } = useScreenNavigation();

  return (
    <div>
      <button onClick={goToChannelGuide}>Go to Channel Guide</button>
      <button onClick={goToWatchingTV}>Watch TV</button>
      <button onClick={goToMainMenu}>Main Menu</button>
      <button onClick={goBack}>Go Back</button>
      <div>Current: {currentScreen()}</div>
    </div>
  );
}

// Example 3: Channel info only
function ChannelDisplay() {
  const currentChannel = useCurrentChannel();

  return (
    <div>
      {currentChannel() && (
        <div>
          <h3>{currentChannel().name}</h3>
          <p>Channel {currentChannel().number}</p>
          {currentChannel().logo && <img src={currentChannel().logo} />}
        </div>
      )}
    </div>
  );
}

// Example 4: Stream control only
function StreamController() {
  const { channelStreamUrl, setChannelStreamUrl } = useChannelStream();

  const playChannel = (url: string) => {
    setChannelStreamUrl(url);
    // This will automatically navigate to "watchingTV"
  };

  return (
    <div>
      <p>Current stream: {channelStreamUrl()}</p>
      <button onClick={() => playChannel("http://example.com/stream.m3u8")}>
        Play Sample Stream
      </button>
    </div>
  );
}

// Screen-based conditional rendering
function AppRouter() {
  const { currentScreen } = useScreenNavigation();

  return (
    <div>
      {currentScreen() === "channelGuide" && <ChannelGuide />}
      {currentScreen() === "watchingTV" && <TVStreamer />}
      {currentScreen() === "mainMenu" && <MainMenu />}
    </div>
  );
}