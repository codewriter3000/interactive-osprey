import { onMount, onCleanup, Show } from "solid-js";
import MainMenu from "./MainMenu.tsx";
import {ChannelGuide} from "./ChannelGuide.tsx";
import { TVProvider, useScreenNavigation, useAppScreen } from "./contexts/TVContext.tsx";

const AppContent = () => {
  const { currentScreen } = useAppScreen();
  const { goToMainMenu, goBack } = useScreenNavigation();

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // If we're already in the main menu, go back to previous screen
        if (currentScreen() === "mainMenu") {
          goBack();
        } else {
          goToMainMenu();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
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