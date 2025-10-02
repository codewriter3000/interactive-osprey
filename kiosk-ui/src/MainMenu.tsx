import { createSignal, For } from "solid-js";
import TVStreamer from "./TVStreamer.tsx";
import "./MainMenu.css";

function MainMenu() {
  const menuItems = [
    {
      id: 0,
      name: "CHANNEL GUIDE",
      color: "#63a3af"
    },
    {
      id: 1,
      name: "ON DEMAND",
      color: "#8889b5"
    },
    {
      id: 2,
      name: "ACTIVE RENTALS",
      color: "#846b95"
    },
    {
      id: 3,
      name: "iO GAMES",
      color: "#c58033"
    },
    {
      id: 4,
      name: "ENHANCED TV",
      color: "#6d8cb3"
    },
    {
      id: 5,
      name: "iO SHOWCASE",
      color: "#003d8b"
    }
  ];

  const [selectedMenuItem, setSelectedMenuItem] = createSignal(-1);
  const [isBeingClicked, setIsBeingClicked] = createSignal(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedMenuItem((prev) => (prev + 1) % menuItems.length);
    } else if (e.key === "ArrowUp") {
      setSelectedMenuItem((prev) => (prev - 1 + menuItems.length) % menuItems.length);
    } else if (e.key === "Enter") {
      clickButton(selectedMenuItem());
    }
  }

  const clickButton = (index: number) => {
    setIsBeingClicked(true);
    setTimeout(() => {
      setIsBeingClicked(false);
    }, 100);
  }

  return (
    <div tabindex="0" onKeyDown={handleKeyDown} class="container">
      <div class="header">
        <div class="menu-heading">
          <div class="top-third">

          </div>
          <div class="middle-third">
            <div class="time">11:39 AM</div>
          </div>
          <div class="bottom-third">
            <img src="./images/optimum logo white.png" width="50" />
            Select an iO service from the list below.
          </div>
        </div>
        <div class="channel-container">
          <div class="upper-part">

          </div>
          <div class="lower-part">
            <div class="channel">6 WPVI</div>
          </div>
        </div>
      </div>
      <div class="main">
        <div class="left-side">
          <div class="right-line"></div>
          <For each={menuItems}>
            {(item, index) => (
              <div
                style={`background-color: ${selectedMenuItem() === index() ? isBeingClicked() ? "#0b1301" : "#e6d318" : ""}; color: ${selectedMenuItem() === index() ? isBeingClicked() ? "#e6d318" : "#0b1301" : ""};`}
                class="menu-item"
              >
                <div>{item.name}</div>
                <div
                  style={`background-color: ${selectedMenuItem() === index() ? item.color : ""} !important;`}
                  class="square"
                  onMouseEnter={(evt) => {
                    setSelectedMenuItem(index());
                  }}
                  onMouseLeave={(evt) => {
                    setSelectedMenuItem(-1);
                  }}
                  onClick={(evt) => {
                    clickButton(selectedMenuItem());
                  }}
                />
              </div>
            )}
          </For>
        </div>
        <TVStreamer />
      </div>
      <div class="footer">
        <img src="./images/geico ad.png" />
      </div>
    </div>
  );
}

export default MainMenu;
