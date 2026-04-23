import { Show } from "solid-js";

function MainMenuHeader({ currentChannel }: { currentChannel: any }) {
  return (
    <div class="header">
      <div class="menu-heading">
        <div class="top-third"></div>
        <div class="middle-third">
          <div class="time">
            {(() => {
              const timeStr = new Date()
                .toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .toLowerCase()
                .replace(" ", "");
              return timeStr[0] === "0" ? timeStr.substring(1) : timeStr;
            })()}
          </div>
        </div>
        <div class="bottom-third">
          <img src="./images/optimum logo white.png" width="50" />
          Select an iO service from the list below.
        </div>
      </div>
      <div class="channel-container">
        <div class="upper-part"></div>
        <div class="lower-part">
          <div class="channel-main-menu">
            {currentChannel?.number}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainMenuHeader;
