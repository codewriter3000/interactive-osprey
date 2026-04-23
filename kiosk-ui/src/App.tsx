import { onMount, onCleanup, Show } from "solid-js";
import MainMenu from "./MainMenu.tsx";
import {ChannelGuide} from "./ChannelGuide.tsx";
import { TVProvider, useScreenNavigation, useAppScreen } from "./contexts/TVContext.tsx";
import { startGamepadKeyboardMapper } from "./lib/gamepadToKeyboard";

const AppContent = () => {
  const { currentScreen } = useAppScreen();
  const { goToMainMenu, goToWatchingTV } = useScreenNavigation();
  const ESCAPE_TOGGLE_COOLDOWN_MS = 250;

  let lastEscapeToggleAt = 0;

  onMount(() => {
    const stopMapper = startGamepadKeyboardMapper();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const now = Date.now();
        if (e.repeat || now - lastEscapeToggleAt < ESCAPE_TOGGLE_COOLDOWN_MS) return;
        lastEscapeToggleAt = now;

        // If we're already in the main menu, return to fullscreen TV
        if (currentScreen() === "mainMenu") {
          goToWatchingTV();
        } else {
          goToMainMenu();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => {
      stopMapper();
      window.removeEventListener("keydown", onKey);
    });
  });

  return (
    <>
      <MainMenu
        onMainMenu={currentScreen() === "mainMenu"}
        inChannelGuide={currentScreen() === "channelGuide"}
      />
      <Show when={currentScreen() === "channelGuide"}>
        <ChannelGuide />
      </Show>
    </>
  );
};

const App = () => {
  return (
    <TVProvider>
      <AppContent />
    </TVProvider>
  );
};

export default App;